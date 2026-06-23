export default {
  async run(config, input) {
    return {
      success: false,
      error: "grpc_call: gRPC native bindings are not available in this environment. Use the HTTP/REST equivalent or a gRPC-Web proxy.",
      skipped: true,
      host: config.host,
      method: config.method,
    };
  },
};
