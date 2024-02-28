import * as t from '@babel/types';

/**
 * 将 JSX 属性值转换为对象值。
 * @param value JSX 属性值
 * @returns 转换后的对象值
 */
export const jsxValueToObjectValue = (value: t.JSXAttribute['value']) => {
  if (t.isJSXExpressionContainer(value)) {
    if (t.isExpression(value.expression)) {
      return value.expression;
    }
    return undefined;
  }
  if (t.isJSXEmptyExpression(value)) {
    return t.stringLiteral('');
  }
  return value;
};

/**
 * 将 JSX 元素转换为 JSON 对象数组。
 * @param child JSX 元素或表达式容器
 * @param index 元素索引
 * @returns JSON 对象数组或 null
 */
export const jsxElementToJSON = (
  child: t.JSXElement | t.JSXFragment | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXText,
  index: number,
):
  | {
      name: string | t.JSXIdentifier;
      value: t.JSXAttribute | t.SpreadElement;
      parent?: t.JSXElement | undefined;
    }[]
  | null => {
  if (t.isJSXElement(child)) {
    const name = getJSXNodeName(child.openingElement?.name);
    if (name === 'Menu.Item' || name === 'MenuItem') {
      return attributesToMap(child).map((prop) => {
        if (prop.name === 'children') {
          return {
            ...prop,
            name: 'label',
          };
        }
        return prop;
      });
    }

    if (name === 'Menu.Divider') {
      return [
        {
          name: 'key',
          value: t.jsxAttribute(t.jsxIdentifier('key'), t.stringLiteral('Divider' + '-' + index)),
        },
        {
          name: 'type',
          value: t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('divider')),
        },
      ];
    }
  }
  if (t.isJSXExpressionContainer(child) && t.isExpression(child.expression)) {
    const expression = child.expression;
    if (t.isLogicalExpression(expression)) {
      const jsxExpression = expression.right;
      if (t.isJSXElement(jsxExpression)) {
        const item = jsxElementToJSON(jsxExpression, 0);
        if (item) {
          child.expression = t.conditionalExpression(
            expression.left,
            jsxElementPropsListToArray([item!]),
            t.arrayExpression([]),
          );
        }
      }
      if (t.isJSXFragment(jsxExpression)) {
        const childrenList = jsxExpression.children;
        const jsxItems: {
          name: string | t.JSXIdentifier;
          value: t.JSXAttribute | t.SpreadElement;
          parent?: t.JSXElement | undefined;
        }[][] = [];
        childrenList.forEach((item, index) => {
          const jsonItem = jsxElementToJSON(item, index);
          if (jsonItem) {
            jsxItems.push(jsonItem);
          }
        });
        child.expression = t.conditionalExpression(
          expression.left,
          jsxElementPropsListToArray(jsxItems),
          t.arrayExpression([]),
        );
      }
    }
    return [
      {
        name: '...',
        value: t.spreadElement(child.expression),
      },
    ];
  }
  return null;
};

/**
 * 将 JSX 元素属性列表转换为数组
 * @param jsxElementList JSX 元素属性列表
 * @returns 转换后的数组表达式
 */
export const jsxElementPropsListToArray = (
  jsxElementList: {
    name: string | t.JSXIdentifier;
    value: t.JSXAttribute | t.JSXEmptyExpression | t.SpreadElement;
  }[][],
) => {
  return t.arrayExpression(
    jsxElementList.map((item) => {
      const props = item
        .map((prop) => {
          if (t.isJSXEmptyExpression(prop?.value)) {
            return '';
          }
          if (t.isSpreadElement(prop.value)) {
            return prop.value;
          }
          if (t.isJSXAttribute(prop.value)) {
            return t.objectProperty(
              t.stringLiteral((prop!.name as t.JSXIdentifier)?.name || (prop!.name as string)),
              jsxValueToObjectValue(prop!.value.value) || t.booleanLiteral(true),
            );
          }
        })
        .filter(Boolean) as t.ObjectProperty[];
      if (props.find((prop) => t.isSpreadElement(prop))) {
        return props.at(0) as any as t.SpreadElement;
      }
      return t.objectExpression(props);
    }),
  );
};

/**
 * 将 JSXOpeningElement 的属性转换为映射对象
 * children 会被转换为 children 属性
 * @param jsxOpeningElement JSXOpeningElement 对象
 * @returns 属性映射对象数组
 */
export const attributesToMap = (jsxElement: t.JSXElement) => {
  const propList: {
    name: string | t.JSXIdentifier;
    value: t.JSXAttribute;
    parent?: t.JSXElement;
  }[] = [];
  const jsxOpeningElement = jsxElement.openingElement;
  jsxOpeningElement.attributes.forEach((item) => {
    if (t.isJSXAttribute(item)) {
      propList.push({
        name: item.name.name,
        value: item,
      });
    }

    if (t.isJSXSpreadAttribute(item)) {
      const argument = item.argument;
      if (t.isObjectExpression(argument)) {
        argument.properties.map((prop) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            propList.push({
              name: prop.key.name,
              value: prop.value as any as t.JSXAttribute,
            });
          }
        });
      }
    }
  });

  if (jsxElement.children?.length) {
    const value = t.jsxAttribute(
      t.jsxIdentifier('children'),
      t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), jsxElement.children),
    );
    value.loc = jsxElement.loc;
    propList.push({
      name: 'children',
      value,
      parent: jsxElement,
    });
  }
  return propList;
};

/**
 * 获取 JSX 节点的名称。
 * @param name JSX 标识符、成员表达式或命名空间名称
 * @returns JSX 节点的名称
 */
export const getJSXNodeName = (
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
): string => {
  // 这个是最简单的JSXIdentifier，用于表示JSX中的标识符。在React中，JSXIdentifier通常用于表示React组件的名称。
  // <ProTable/>
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  // 在React中，JSXMemberExpression是JSX中的一种语法，用于表示成员表达式。JSXMemberExpression通常用于访问React组件中的属性或方法。
  // const element = <MyComponent.someMethod />;
  if (t.isJSXMemberExpression(name)) {
    return getJSXNodeName(name.object) + '.' + name.property.name;
  }

  // JSXNamespacedName是JSX中的一种特殊语法，用于表示命名空间的JSX元素。在React中，JSXNamespacedName用于表示命名空间的XML元素，通常用于SVG图形或其它XML命名空间中的元素。
  // 例如，下面是一个使用JSXNamespacedName的示例：
  // ```jsx
  // const element = <svg:circle cx="50" cy="50" r="40" fill="red" />;
  // ```
  // 在这个例子中，`svg:circle`是一个JSXNamespacedName，表示SVG命名空间中的`circle`元素。这种语法允许在React应用中使用XML命名空间中的元素，例如SVG元素。

  if (t.isJSXNamespacedName(name)) {
    return name.namespace.name;
  }
  return '';
};

/**
 * 将 bodyStyle 属性转换为 styles.body 属性。
 * @param prop
 * @returns
 */
export const xxxStyleToStylesBody = (
  prop: t.JSXAttribute,
  type: 'body' | 'header' | 'mask' | 'wrapper' | 'content' | 'footer' = 'body',
) => {
  const bodyStyleValue = prop.value;
  if (
    bodyStyleValue &&
    t.isJSXExpressionContainer(bodyStyleValue) &&
    !t.isJSXEmptyExpression(bodyStyleValue.expression)
  ) {
    prop.name = t.jsxIdentifier('styles');
    prop.value = t.jsxExpressionContainer(
      t.objectExpression([
        t.objectProperty(
          t.identifier(type),
          // body 应该不会给一个空对象吧
          bodyStyleValue.expression,
        ),
      ]),
    );
  }

  return prop;
};

/**
 *  将 visible 属性转换为 open 属性。
 * @param prop
 * @returns
 */
export const visibleToOpen = (prop: t.JSXAttribute) => {
  prop.name = t.jsxIdentifier('open');
  return prop;
};

/**
 * 将 afterVisibleChange 属性转换为 afterOpenChange 属性。
 * @param prop
 * @returns
 */
export const afterVisibleChangeToAfterOpenChange = (prop: t.JSXAttribute) => {
  prop.name = t.jsxIdentifier('afterOpenChange');
  return prop;
};

/**
 * 将 onVisibleChange 属性转换为 onOpenChange 属性。
 * @param prop
 * @returns
 */
export const onVisibleChangeChangeToOnOpenChange = (prop: t.JSXAttribute) => {
  prop.name = t.jsxIdentifier('onOpenChange');
  return prop;
};

export const borderedToVariant = (prop: t.JSXAttribute) => {
  if (
    t.isJSXExpressionContainer(prop.value) &&
    t.isBooleanLiteral(prop.value.expression) &&
    prop.value.expression.value === false
  ) {
    const newProps = t.jsxAttribute(t.jsxIdentifier('variant'), t.stringLiteral('borderless'));
    prop = newProps;
    return {
      message: `将 bordered={false} 替换为 variant='borderless'`,
      props: prop,
      actionName: `将 bordered 删除`,
    };
  }

  if (t.isJSXAttribute(prop) && prop.value === null) {
    return {
      message: `bordered 是默认值，可以直接删除`,
      props: '',
      actionName: `将 bordered 删除`,
    };
  }
  if (
    t.isJSXAttribute(prop) &&
    t.isJSXExpressionContainer(prop.value) &&
    t.isBinaryExpression(prop.value.expression)
  ) {
    const binaryExpression = prop.value.expression as t.BinaryExpression;
    const newProps = t.jsxAttribute(
      t.jsxIdentifier('variant'),
      t.jsxExpressionContainer(
        t.conditionalExpression(
          binaryExpression,
          t.stringLiteral('outlined'),
          t.stringLiteral('borderless'),
        ),
      ),
    );
    return {
      message: `将 bordered 表达式替换为 variant 表达式`,
      props: newProps,
      actionName: `将 bordered 表达式替换为 variant 表达式`,
    };
  }
};
