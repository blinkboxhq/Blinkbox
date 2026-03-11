import ivm from "isolated-vm";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB hard limit

export default {
  async run(config, input) {
    const { code } = config;

    if (!code) {
      return input;
    }

    // V8 MEMORY GUARD: Reject oversized payloads before they enter the isolate
    const inputStr = JSON.stringify(input || {});
    const byteSize = Buffer.byteLength(inputStr, "utf8");
    if (byteSize > MAX_PAYLOAD_BYTES) {
      throw new Error(
        `Payload rejected: ${(byteSize / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit. ` +
        `Reduce input size or filter data upstream.`,
      );
    }

    // 1. Create a C++ memory-isolated container (Hard capped at 64MB RAM)
    const isolate = new ivm.Isolate({ memoryLimit: 64 });
    const context = await isolate.createContext();
    const jail = context.global;

    // 2. The JSON Bridge: Pass pre-serialized data across the memory barrier
    await jail.set("__raw_input", inputStr);

    try {
      // 3. Construct the secure execution wrapper
      const secureWrapper = `
        (async () => {
          // Parse the safe string back into a workable object inside the cage
          const $input = JSON.parse(__raw_input);
          let $output = JSON.parse(__raw_input);
          
          // Dummy console to prevent crashes if they type console.log
          const console = { log: () => {} };

          // === USER CODE START ===
          ${code}
          // === USER CODE END ===

          // Serialize the result to send it back out of the Isolate
          return JSON.stringify($output);
        })();
      `;

      // 4. Compile the script inside the Isolate
      const script = await isolate.compileScript(secureWrapper);

      // 5. Execute with a strict 2-second wall-clock kill switch
      const resultStr = await script.run(context, {
        promise: true,
        timeout: 2000,
      });

      return JSON.parse(resultStr);
    } catch (err) {
      throw new Error(`[Code Node Meltdown] Execution Failed: ${err.message}`);
    } finally {
      // 🧹 6. CRITICAL: Destroy the isolate to free the C++ memory immediately
      isolate.dispose();
    }
  },
};
