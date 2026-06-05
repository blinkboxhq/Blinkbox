export default {
  backendType: "grpc_call",
  label: "gRPC",
  description: "Call any gRPC method using a .proto definition and structured request payload.",
  fields: [
    { name: "host", label: "Host", type: "string", smart: true, placeholder: "grpc.example.com:50051" },
    { name: "protoPath", label: "Proto File Path", type: "string", smart: true, placeholder: "/path/to/service.proto", hint: "Path to .proto file or paste content below" },
    { name: "protoContent", label: "Proto File Content", type: "string", smart: true, multiline: true, optional: true, hint: "Paste .proto file contents if not using a path" },
    { name: "service", label: "Service", type: "string", smart: true, placeholder: "YourService" },
    { name: "method", label: "Method", type: "string", smart: true, placeholder: "GetUser" },
    { name: "requestPayload", label: "Request Payload (JSON)", type: "string", smart: true, multiline: true, hint: "JSON object as request body" },
    { name: "useTls", label: "Use TLS", type: "boolean", default: true },
  ],
  outputs: ["response", "status"],
};
