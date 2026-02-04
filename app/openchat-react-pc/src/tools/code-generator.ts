export interface ComponentTemplateOptions {
  name: string;
  path: string;
  type: 'functional' | 'class';
  withProps: boolean;
  withState: boolean;
  withEffects: boolean;
  withStyles: boolean;
  withTests: boolean;
}

export interface ServiceTemplateOptions {
  name: string;
  path: string;
  withInterface: boolean;
  withImplementation: boolean;
  withTests: boolean;
}

export class CodeGenerator {
  /**
   * 生成React组件模板
   */
  generateComponent(options: ComponentTemplateOptions): {
    component: string;
    test?: string;
    style?: string;
  } {
    const { name, type, withProps, withState, withEffects, withStyles, withTests } = options;
    const componentName = this.toPascalCase(name);
    const fileName = this.toKebabCase(name);

    let componentCode = '';
    let testCode = '';
    let styleCode = '';

    // 生成组件代码
    if (type === 'functional') {
      componentCode = this.generateFunctionalComponent({
        name: componentName,
        withProps,
        withState,
        withEffects,
        withStyles
      });
    } else {
      componentCode = this.generateClassComponent({
        name: componentName,
        withProps,
        withState,
        withEffects,
        withStyles
      });
    }

    // 生成测试代码
    if (withTests) {
      testCode = this.generateComponentTest(componentName, fileName);
    }

    // 生成样式代码
    if (withStyles) {
      styleCode = this.generateComponentStyles(fileName);
    }

    return {
      component: componentCode,
      test: withTests ? testCode : undefined,
      style: withStyles ? styleCode : undefined
    };
  }

  /**
   * 生成服务模板
   */
  generateService(options: ServiceTemplateOptions): {
    interface?: string;
    implementation: string;
    test?: string;
  } {
    const { name, withInterface, withImplementation, withTests } = options;
    const serviceName = this.toPascalCase(name);
    const fileName = this.toKebabCase(name);

    let interfaceCode = '';
    let implementationCode = '';
    let testCode = '';

    // 生成接口代码
    if (withInterface) {
      interfaceCode = this.generateServiceInterface(serviceName);
    }

    // 生成实现代码
    if (withImplementation) {
      implementationCode = this.generateServiceImplementation(serviceName, withInterface);
    }

    // 生成测试代码
    if (withTests) {
      testCode = this.generateServiceTest(serviceName, fileName);
    }

    return {
      interface: withInterface ? interfaceCode : undefined,
      implementation: implementationCode,
      test: withTests ? testCode : undefined
    };
  }

  /**
   * 生成功能组件
   */
  private generateFunctionalComponent(options: {
    name: string;
    withProps: boolean;
    withState: boolean;
    withEffects: boolean;
    withStyles: boolean;
  }): string {
    const { name, withProps, withState, withEffects, withStyles } = options;

    let imports = 'import React';
    if (withState) imports += ', { useState';
    if (withEffects) imports += withState ? ', useEffect' : ', { useEffect';
    if (withState || withEffects) imports += ' }';
    imports += " from 'react';\n";

    if (withStyles) {
      imports += `import './${this.toKebabCase(name)}.css';\n`;
    }

    let propsInterface = '';
    if (withProps) {
      propsInterface = `\ninterface ${name}Props {\n  title?: string;\n  className?: string;\n}\n`;
    }

    let componentBody = '';
    if (withState) {
      componentBody += '  const [count, setCount] = useState(0);\n\n';
    }

    if (withEffects) {
      componentBody += '  useEffect(() => {\n';
      componentBody += '    // Effect logic here\n';
      componentBody += '    return () => {\n';
      componentBody += '      // Cleanup logic here\n';
      componentBody += '    };\n';
      componentBody += '  }, []);\n\n';
    }

    componentBody += '  return (\n';
    componentBody += '    <div className={className}>\n';
    componentBody += `      <h1>${name} Component</h1>\n`;
    if (withState) {
      componentBody += '      <p>Count: {count}</p>\n';
      componentBody += '      <button onClick={() => setCount(count + 1)}>Increment</button>\n';
    }
    componentBody += '    </div>\n';
    componentBody += '  );\n';

    const propsParam = withProps ? 'props: ' + name + 'Props' : 'props: { className = "" }';
    const className = withProps ? 'props.className' : 'className';

    return `${imports}${propsInterface}\n/**\n * ${name} Component\n */\nexport const ${name}: React.FC<${withProps ? name + 'Props' : 'any'}> = (${propsParam}) => {\n${componentBody}};\n`;
  }

  /**
   * 生成类组件
   */
  private generateClassComponent(options: {
    name: string;
    withProps: boolean;
    withState: boolean;
    withEffects: boolean;
    withStyles: boolean;
  }): string {
    const { name, withProps, withState, withEffects, withStyles } = options;

    let imports = 'import React, { Component';
    if (withEffects) imports += ', Lifecycle';
    imports += " } from 'react';\n";

    if (withStyles) {
      imports += `import './${this.toKebabCase(name)}.css';\n`;
    }

    let propsInterface = '';
    let stateInterface = '';

    if (withProps) {
      propsInterface = `\ninterface ${name}Props {\n  title?: string;\n  className?: string;\n}\n`;
    }

    if (withState) {
      stateInterface = `\ninterface ${name}State {\n  count: number;\n}\n`;
    }

    let componentBody = '';

    if (withEffects) {
      componentBody += '  componentDidMount(): void {\n';
      componentBody += '    // Component did mount logic\n';
      componentBody += '  }\n\n';
      componentBody += '  componentWillUnmount(): void {\n';
      componentBody += '    // Component will unmount logic\n';
      componentBody += '  }\n\n';
    }

    componentBody += '  render(): React.ReactNode {\n';
    componentBody += '    const { className } = this.props;\n';
    if (withState) {
      componentBody += '    const { count } = this.state;\n';
    }
    componentBody += '    return (\n';
    componentBody += '      <div className={className}>\n';
    componentBody += `        <h1>${name} Component</h1>\n`;
    if (withState) {
      componentBody += '        <p>Count: {count}</p>\n';
      componentBody += '        <button onClick={() => this.setState({ count: count + 1 })}>Increment</button>\n';
    }
    componentBody += '      </div>\n';
    componentBody += '    );\n';
    componentBody += '  }\n';

    const propsType = withProps ? name + 'Props' : 'any';
    const stateType = withState ? name + 'State' : 'any';
    const initialState = withState ? '  state: ' + name + 'State = {\n    count: 0\n  };\n\n' : '';

    return `${imports}${propsInterface}${stateInterface}\n/**\n * ${name} Component\n */\nexport class ${name} extends Component<${propsType}, ${stateType}> {\n${initialState}${componentBody}}\n`;
  }

  /**
   * 生成组件测试
   */
  private generateComponentTest(componentName: string, fileName: string): string {
    return `import { describe, it, expect, render } from 'vitest';
import { ${componentName} } from '../${fileName}';

describe('${componentName}', () => {
  it('should render correctly', () => {
    const { container } = render(<${componentName} />);
    expect(container).toBeTruthy();
  });

  it('should render with title prop', () => {
    const testTitle = 'Test Title';
    const { getByText } = render(<${componentName} title={testTitle} />);
    expect(getByText(testTitle)).toBeTruthy();
  });
});
`;
  }

  /**
   * 生成组件样式
   */
  private generateComponentStyles(fileName: string): string {
    return `.${fileName} {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f5f5f5;
}

.${fileName} h1 {
  font-size: 24px;
  margin-bottom: 16px;
  color: #333;
}

.${fileName} button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.${fileName} button:hover {
  background-color: #0069d9;
}
`;
  }

  /**
   * 生成服务接口
   */
  private generateServiceInterface(serviceName: string): string {
    return `export interface ${serviceName} {
  initialize(): void;
  getData(): Promise<any>;
  setData(data: any): void;
  clearData(): void;
}
`;
  }

  /**
   * 生成服务实现
   */
  private generateServiceImplementation(serviceName: string, withInterface: boolean): string {
    const interfaceImport = withInterface ? `import { ${serviceName} } from './${this.toKebabCase(serviceName)}.interface';\n` : '';
    const implementsClause = withInterface ? ` implements ${serviceName}` : '';

    return `${interfaceImport}\nexport class ${serviceName}Impl${implementsClause} {
  private data: any = null;

  initialize(): void {
    // Initialization logic here
  }

  async getData(): Promise<any> {
    return this.data;
  }

  setData(data: any): void {
    this.data = data;
  }

  clearData(): void {
    this.data = null;
  }
}

// Export singleton instance
export const ${this.toCamelCase(serviceName)} = new ${serviceName}Impl();
`;
  }

  /**
   * 生成服务测试
   */
  private generateServiceTest(serviceName: string, fileName: string): string {
    const instanceName = this.toCamelCase(serviceName);

    return `import { describe, it, expect, beforeEach } from 'vitest';
import { ${instanceName} } from '../${fileName}';

describe('${serviceName}', () => {
  beforeEach(() => {
    ${instanceName}.initialize();
  });

  it('should initialize without errors', () => {
    expect(() => {
      ${instanceName}.initialize();
    }).not.toThrow();
  });

  it('should set and get data', async () => {
    const testData = { key: 'value' };
    ${instanceName}.setData(testData);
    const data = await ${instanceName}.getData();
    expect(data).toEqual(testData);
  });

  it('should clear data', async () => {
    const testData = { key: 'value' };
    ${instanceName}.setData(testData);
    ${instanceName}.clearData();
    const data = await ${instanceName}.getData();
    expect(data).toBeNull();
  });
});
`;
  }

  /**
   * 转换为 PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * 转换为 camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * 转换为 kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.toLowerCase())
      .join('-');
  }
}

// 导出单例实例
export const codeGenerator = new CodeGenerator();
