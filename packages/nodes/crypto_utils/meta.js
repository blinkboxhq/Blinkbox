export default {
  backendType: "crypto_utils",
  label: "Crypto Utils",
  description: "Hash, HMAC, base64, UUID, random tokens",
  fields: [
    {
      name: "operation", label: "Operation", type: "options", cols: 2, default: "hash",
      options: [
        { value: "hash", label: "Hash" },
        { value: "hmac", label: "HMAC Sign" },
        { value: "base64encode", label: "Base64 Encode" },
        { value: "base64decode", label: "Base64 Decode" },
        { value: "uuid", label: "Generate UUID" },
        { value: "random", label: "Random Bytes" },
      ],
    },
    {
      name: "input", label: "Input", type: "string", smart: true, placeholder: "{{ $json.payload }}",
      show: { operation: ["hash", "hmac", "base64encode", "base64decode"] },
    },
    {
      name: "algorithm", label: "Algorithm", type: "options", cols: 4, default: "sha256",
      options: ["sha256", "sha512", "sha1", "md5"],
      show: { operation: ["hash", "hmac"] },
    },
    {
      name: "secret", label: "HMAC Secret", type: "string", smart: true, placeholder: "{{ $credential.secret }}",
      show: { operation: "hmac" },
    },
    {
      name: "encoding", label: "Output Encoding", type: "options", cols: 3, default: "hex",
      options: ["hex", "base64", "base64url"],
      show: { operation: ["hash", "hmac"] },
    },
    {
      name: "length", label: "Byte Length", type: "number", min: 8, max: 128, default: 32,
      show: { operation: "random" },
    },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result" },
  ],
  outputs: ["result"],
};
