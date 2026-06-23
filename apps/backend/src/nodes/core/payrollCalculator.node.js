export default {
  async run(config, input) {
    const gross = parseFloat(config.grossSalary ?? input?.grossSalary ?? 0);
    const taxRate = parseFloat(config.taxRate ?? 20) / 100;
    const socialSecurity = parseFloat(config.socialSecurity ?? 6.2) / 100;
    const medicare = parseFloat(config.medicare ?? 1.45) / 100;
    const otherDeductions = parseFloat(config.otherDeductions ?? 0);

    const federalTax = gross * taxRate;
    const ssTax = gross * socialSecurity;
    const medicareTax = gross * medicare;
    const totalDeductions = federalTax + ssTax + medicareTax + otherDeductions;
    const netPay = gross - totalDeductions;

    return {
      grossSalary: Math.round(gross * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      socialSecurityTax: Math.round(ssTax * 100) / 100,
      medicareTax: Math.round(medicareTax * 100) / 100,
      otherDeductions,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      effectiveTaxRate: Math.round((totalDeductions / gross) * 10000) / 100,
    };
  },
};
