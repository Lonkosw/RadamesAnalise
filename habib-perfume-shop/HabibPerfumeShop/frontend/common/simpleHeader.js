// Header simples: mostra logo + botões Entrar / Cadastrar ou Usuário + Sair
(function(){
  const API = 'http://localhost:3001';
  function build(){
    const header = document.createElement('div');
    header.id='app-header';
    header.innerHTML = `
      <style>
        #app-header{position:fixed;top:0;left:0;right:0;height:60px;background:#222;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px;font-family:Arial,Helvetica,sans-serif;z-index:500}
        #app-header .brand{font-weight:bold;cursor:pointer;letter-spacing:1px}
        #app-header nav button{margin-left:8px;background:#444;color:#fff;border:none;padding:8px 14px;border-radius:4px;cursor:pointer;font-size:14px}
        #app-header nav button.primary{background:#5a67d8}
        #app-header nav button:hover{background:#666}
        body{padding-top:60px!important}
        #back-btn{position:fixed;top:70px;left:15px;background:#222;color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;z-index:400;box-shadow:0 2px 6px rgba(0,0,0,.3)}
      </style>
      <div class='brand' id='brandHome'>Habib Perfume</div>
      <nav id='navArea'>Carregando...</nav>
    `;
    document.body.appendChild(header);

    // back button (não exibe na index)
    if(!/\/index\.html$/.test(location.pathname) && location.pathname !== '/' ){ 
      const back = document.createElement('button');
      back.id='back-btn';
      back.textContent='←';
      back.title='Voltar';
      back.onclick=()=>{ if(history.length>1) history.back(); else location.href=API + '/menu'; };
      document.body.appendChild(back);
    }
  document.getElementById('brandHome').onclick = ()=>{location.href = API + '/';};
  }

  async function loadState(){
    try{
      const r = await fetch(API + '/login/status',{credentials:'include'});
      const data = await r.json();
      if(data.status==='ok') renderLogged(data.usuario); else renderAnon();
    }catch(e){renderAnon();}
  }

  function renderAnon(){
    const nav = document.getElementById('navArea');
    nav.innerHTML = '';
    // Se estiver na index, não mostrar botões redundantes (já existem no centro)
    if(location.pathname.endsWith('/') || /index\.html$/.test(location.pathname)){
      return; // nada a exibir
    }
    const btnLogin = mkBtn('Entrar','primary',()=> location.href = API + '/login/login.html');
    const btnCad = mkBtn('Cadastrar','',()=> location.href = API + '/login/login.html?cadastro=true');
    nav.appendChild(btnLogin); nav.appendChild(btnCad);
  }

  function renderLogged(usuario){
    const nav = document.getElementById('navArea');
    nav.innerHTML = '';
    let papel;
    if(usuario.tipo==='funcionario') papel = (usuario.gerente || (usuario.cargo||'').toLowerCase().includes('gerente')) ? 'Gerente' : 'Funcionário';
    else papel = 'Cliente';
    const select = document.createElement('select');
    select.style.padding='6px';
    select.style.borderRadius='4px';
    const optTitulo = document.createElement('option');
    optTitulo.value='';
    optTitulo.textContent = `${usuario.nome} (${papel})`;
    const optSair = document.createElement('option'); optSair.value='sair'; optSair.textContent='Sair';
    select.appendChild(optTitulo); select.appendChild(optSair);
    select.onchange = async (e)=>{ if(e.target.value==='sair'){ await fetch(API + '/login/logout',{method:'POST',credentials:'include'}); location.href = API + '/login/login.html'; } };
    nav.appendChild(select);
  }

  function mkBtn(text,cls,fn){ const b=document.createElement('button'); if(cls) b.classList.add(cls); b.textContent=text; b.onclick=fn; return b; }

  build();
  loadState();
})();
