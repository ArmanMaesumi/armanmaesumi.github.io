document.addEventListener('DOMContentLoaded',()=>{
    const items = document.querySelectorAll('details');
  if (!items.length || items.length < 2) return;

  let collapsed = false;
  const btn = document.createElement('button');
  btn.textContent = 'Collapse All';
  btn.style.cssText = [
    'position: fixed',
    'bottom: 2.5rem',
    'right: 1rem',
    'padding: .5rem 1rem',
    'background: var(--md-default-fg)',
    'color: var(--md-default-bg)',
    'border: none',
    'cursor: pointer',
    'z-index: 9999',
    'font-size: 0.75rem',
  ].join(';');
  document.body.appendChild(btn);
  btn.addEventListener('click',()=>{
    console.log(document.querySelectorAll('details'));
    document.querySelectorAll('details').forEach(d=>d.open = collapsed);
    collapsed = !collapsed;
    btn.textContent = collapsed ? 'Expand All' : 'Collapse All';
  });
});
