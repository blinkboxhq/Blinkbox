export default {
  backendType: "math_expression",
  label: "Math Expression",
  description: "Evaluate a mathematical formula safely",
  fields: [
    {
      name: "expression", label: "Expression", type: "string", smart: true, multiline: true,
      placeholder: "round({{ $json.price }} * 1.18, 2)",
      hint: "Supports +, -, *, /, %, ^, abs(), round(), floor(), ceil(), min(), max(), sqrt(), random()",
      examples: [
        "round(price * 1.18, 2)",
        "(a + b) / c",
        "max(score1, score2)",
        "abs(balance)",
        "floor(random() * 100)",
      ],
    },
    { name: "precision", label: "Round to Decimals (-1 = off)", type: "number", min: -1, max: 10, default: -1 },
    { name: "outputField", label: "Output Field", type: "string", smart: false, mono: true, default: "result", placeholder: "result" },
  ],
  outputs: ["result"],
};
