/**
 * ID Generation Utilities
 * 
 * Generates human-readable, sequential IDs with prefixes:
 * - Users: U-001, U-002, etc.
 * - Companies: C-001, C-002, etc.
 * - Employees: E-001, E-002, etc.
 * - Logs: L-001, L-002, etc.
 * - Tasks: T-001, T-002, etc.
 * - Dependants: D-001, D-002, etc.
 * - Templates: TMP-001, TMP-002, etc.
 */

const ID_COUNTERS_KEY = "cms_id_counters";

interface IDCounters {
  user: number;
  company: number;
  employee: number;
  log: number;
  task: number;
  dependant: number;
  template: number;
  slTask: number;
  hrTemplate: number;
  residencyTemplate: number;
}

function getCounters(): IDCounters {
  try {
    const data = localStorage.getItem(ID_COUNTERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Fall through to default
  }
  
  // Default counters
  return {
    user: 0,
    company: 0,
    employee: 0,
    log: 0,
    task: 0,
    dependant: 0,
    template: 0,
    slTask: 0,
    hrTemplate: 0,
    residencyTemplate: 0,
  };
}

function saveCounters(counters: IDCounters): void {
  localStorage.setItem(ID_COUNTERS_KEY, JSON.stringify(counters));
}

function generateID(type: keyof IDCounters, prefix: string): string {
  const counters = getCounters();
  counters[type]++;
  saveCounters(counters);
  
  // Pad the number to 3 digits (001, 002, etc.)
  const paddedNumber = counters[type].toString().padStart(3, '0');
  return `${prefix}-${paddedNumber}`;
}

export const idGenerator = {
  // Generate IDs
  generateUserID(): string {
    return generateID('user', 'USR');
  },
  
  generateCompanyID(): string {
    return generateID('company', 'C');
  },
  
  generateEmployeeID(): string {
    return generateID('employee', 'E');
  },
  
  generateLogID(): string {
    return generateID('log', 'L');
  },
  
  generateTaskID(): string {
    return generateID('task', 'T');
  },
  
  generateDependantID(): string {
    return generateID('dependant', 'D');
  },
  
  generateTemplateID(): string {
    return generateID('template', 'TMP');
  },
  
  generateSLTaskID(): string {
    return generateID('slTask', 'SL');
  },
  
  generateHRTemplateID(): string {
    return generateID('hrTemplate', 'HR');
  },
  
  generateResidencyTemplateID(): string {
    return generateID('residencyTemplate', 'RES');
  },
  
  // Initialize counters from existing data
  initializeCountersFromExistingData(data: {
    users?: any[];
    companies?: any[];
    employees?: any[];
    logs?: any[];
    tasks?: any[];
    dependants?: any[];
    templates?: any[];
  }): void {
    const counters = getCounters();
    
    // Extract highest numbers from existing IDs
    if (data.users) {
      const userNums = data.users
        .map(u => parseInt(u.id?.split('-')[1] || '0'))
        .filter(n => !isNaN(n));
      if (userNums.length > 0) {
        counters.user = Math.max(...userNums, counters.user);
      }
    }
    
    if (data.companies) {
      const companyNums = data.companies
        .map(c => parseInt(c.id?.split('-')[1] || '0'))
        .filter(n => !isNaN(n));
      if (companyNums.length > 0) {
        counters.company = Math.max(...companyNums, counters.company);
      }
    }
    
    if (data.employees) {
      const employeeNums = data.employees
        .map(e => parseInt(e.id?.split('-')[1] || '0'))
        .filter(n => !isNaN(n));
      if (employeeNums.length > 0) {
        counters.employee = Math.max(...employeeNums, counters.employee);
      }
    }
    
    saveCounters(counters);
  },
  
  // Reset all counters (dangerous - only for complete data wipe)
  resetAllCounters(): void {
    localStorage.removeItem(ID_COUNTERS_KEY);
  },
};
