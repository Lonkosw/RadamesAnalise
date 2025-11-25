// Pequeno helper reutilizável para CRUDs
export function $(sel,ctx=document){return ctx.querySelector(sel);} 
export function el(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e;}
export function qsAll(sel,ctx=document){return Array.from(ctx.querySelectorAll(sel));}

export function buildTable(container,{columns,data,onEdit,onDelete,emptyMsg='Sem registros'}={}){
  container.innerHTML='';
  const wrap = el('div','table-wrap');
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  columns.forEach(c=>{const th=document.createElement('th');th.textContent=c.label;trh.appendChild(th);});
  const thActions = document.createElement('th');thActions.textContent='Ações';trh.appendChild(thActions);
  thead.appendChild(trh);table.appendChild(thead);
  const tbody=document.createElement('tbody');
  const arr = Array.isArray(data) ? data : [];
  if(arr.length===0){const tr=el('tr');const td=el('td');td.colSpan=columns.length+1;td.className='empty';td.textContent=emptyMsg;tr.appendChild(td);tbody.appendChild(tr);}else{
    arr.forEach(row=>{
      const tr=document.createElement('tr');
      columns.forEach(c=>{
        const td=document.createElement('td');
        let v=row[c.field];
        if(v===null||v===undefined) v='';
        td.textContent=v;tr.appendChild(td);
      });
      const tdA=el('td','actions-col');
      const bE=el('button');bE.textContent='Editar';bE.onclick=()=>onEdit&&onEdit(row);
      const bD=el('button');bD.textContent='Del';bD.className='danger';bD.onclick=()=>onDelete&&onDelete(row);
      tdA.appendChild(bE);tdA.appendChild(bD);tr.appendChild(tdA);tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);wrap.appendChild(table);container.appendChild(wrap);
}

export function fillForm(form,obj){ if(!form||!obj)return; qsAll('[name]',form).forEach(f=>{ if(obj[f.name]!==undefined) f.value=obj[f.name]; }); }
export function serialize(form){const o={};qsAll('[name]',form).forEach(f=>o[f.name]=f.value.trim());return o;}
export function clear(form){qsAll('[name]',form).forEach(f=>f.value='');}

export function feedback(elm,msg,ok){ if(!elm)return; elm.textContent=msg; elm.className='feedback '+(ok?'status-ok':'status-err'); }
