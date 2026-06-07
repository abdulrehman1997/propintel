'use client';
import { Children, cloneElement, isValidElement, useId } from 'react';
import { Tooltip } from './Tooltip';

/**
 * Injects the given id onto the first real form control found in the subtree
 * (input/select/textarea), so a sibling <label htmlFor> can name it. Falls
 * back to the first valid element when no recognised control is present.
 */
const withControlId = (children, id) => {
  let injected = false;
  const tag = (el) => (typeof el.type === 'string' ? el.type : null);

  const walk = (nodes) =>
    Children.map(nodes, (child) => {
      if (injected || !isValidElement(child)) return child;
      const t = tag(child);
      if (t === 'input' || t === 'select' || t === 'textarea') {
        injected = true;
        return child.props.id ? child : cloneElement(child, { id });
      }
      if (child.props && child.props.children) {
        return cloneElement(child, {}, walk(child.props.children));
      }
      return child;
    });

  return walk(children);
};

export const InputGroup = ({ label, children, tooltip }) => {
  const controlId = `input-${useId()}`;

  return (
    <div className="mb-4">
      <div className="flex items-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
        {/* htmlFor associates this caption with the nested control's injected id. */}
        <label htmlFor={controlId}>{label}</label>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {withControlId(children, controlId)}
    </div>
  );
};
