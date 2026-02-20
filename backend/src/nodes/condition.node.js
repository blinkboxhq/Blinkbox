export default {
  async run(config, payload = {}) {
    const { field, operator, value } = config;

    const left = payload[field];

    let result = false;

    switch (operator) {
      case "==":
        result = left == value;
        break;
      case "===":
        result = left === value;
        break;
      case "!=":
        result = left != value;
        break;
      case ">":
        result = left > value;
        break;
      case "<":
        result = left < value;
        break;
      default:
        throw new Error("Unsupported condition operator");
    }

    return { result };
  },
};
