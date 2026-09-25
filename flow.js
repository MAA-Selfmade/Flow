/* Flow — opgavesystem for Selfmade e-commerce. Bygget fra src/ med tools/build.mjs. */
;
// Minimal host: a logic class with synchronous setState (state merges immediately, re-render is batched per frame).
(function () {
  const React = window.React;
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; this.__host = null; }
    setState(update, cb) {
      const prev = this.state;
      const patch = typeof update === 'function' ? update(prev) : update;
      if (!patch) return;
      this.state = Object.assign({}, prev, patch);
      if (this.onStateChange) this.onStateChange(prev, this.state, patch);
      if (this.__host) this.__host.bump(cb);
    }
    forceUpdate() { if (this.__host) this.__host.bump(); }
    componentDidMount() {}
    componentWillUnmount() {}
    renderVals() { return {}; }
  }
  class Host extends React.Component {
    constructor(p) { super(p); this.state = { v: 0 }; this.logic = p.logic; this.logic.__host = this; }
    bump(cb) { this.setState(s => ({ v: s.v + 1 }), cb); }
    componentDidMount() { this.logic.componentDidMount(); }
    componentWillUnmount() { this.logic.componentWillUnmount(); }
    render() { return window.FlowRender.render(this.logic.renderVals()); }
  }
  // Luk kun et vindue, når både museklik ned og op sker på den mørke baggrund.
  // Ellers lukker vinduet, hvis man markerer tekst i et felt og slipper musen uden for.
  let downTarget = null;
  window.addEventListener('mousedown', (e) => { downTarget = e.target; }, true);
  window.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-bd') === '1' && downTarget !== t) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // ---------- Dansk datovælger: mandag først, ugenumre, dd.mm.åååå ----------
  const MON = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; };
  const fmt = (v) => { const d = fromIso(v); return d ? pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() : ''; };
  const parseDa = (t) => {
    const m = /^\s*(\d{1,2})[.\/\- ](\d{1,2})(?:[.\/\- ](\d{2,4}))?\s*$/.exec(t || ''); if (!m) return null;
    let y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1], 12);
    return d.getMonth() === +m[2] - 1 ? iso(d) : null;
  };
  const isoWeek = (d) => { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const w1 = new Date(t.getFullYear(), 0, 4, 12); return 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
  const e = React.createElement;
  class FlowDate extends React.Component {
    constructor(p) { super(p); this.state = { open: false, text: null, view: null }; this.ref = React.createRef(); this.pop = React.createRef();
      this.onDoc = (ev) => { if (!this.state.open) return; const t = ev.target; if ((this.ref.current && this.ref.current.contains(t)) || (this.pop.current && this.pop.current.contains(t))) return; this.close(); };
      this.onKey = (ev) => { if (ev.key === 'Escape' && this.state.open) { ev.stopPropagation(); this.close(); } }; }
    componentDidMount() { document.addEventListener('mousedown', this.onDoc, true); document.addEventListener('keydown', this.onKey, true); }
    componentWillUnmount() { document.removeEventListener('mousedown', this.onDoc, true); document.removeEventListener('keydown', this.onKey, true); }
    emit(v) { if (this.props.onChange) this.props.onChange({ target: { value: v || '' }, currentTarget: { value: v || '' }, stopPropagation() {}, preventDefault() {} }); }
    openIt() { if (this.state.open) return; const d = fromIso(this.props.value) || new Date(); const r = this.ref.current.getBoundingClientRect();
      const W = 252, H = 290; let left = Math.min(r.left, window.innerWidth - W - 8), top = r.bottom + 4; if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - 4);
      this.setState({ open: true, view: new Date(d.getFullYear(), d.getMonth(), 1, 12), pos: { left: Math.max(8, left), top }, font: getComputedStyle(this.ref.current).fontFamily }); }
    close() { this.setState({ open: false }); }
    pick(v) { this.emit(v); this.setState({ open: false, text: null }); }
    commitText() { const t = this.state.text; if (t === null) return; if (t.trim() === '') this.emit(''); else { const v = parseDa(t); if (v) this.emit(v); } this.setState({ text: null }); }
    renderPop() {
      const vw = this.state.view, y = vw.getFullYear(), mo = vw.getMonth(), sel = this.props.value, today = iso(new Date());
      const first = new Date(y, mo, 1, 12), start = new Date(y, mo, 1 - ((first.getDay() + 6) % 7), 12);
      const nav = (n) => (ev) => { ev.preventDefault(); this.setState({ view: new Date(y, mo + n, 1, 12) }); };
      const btn = { cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0 };
      const rows = [];
      for (let w = 0; w < 6; w++) {
        const cells = [], d0 = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7, 12);
        if (w === 5 && d0.getMonth() !== mo) break;
        cells.push(e('div', { key: 'w', style: { width: 22, fontSize: 10, color: '#B5AEA6', textAlign: 'center', lineHeight: '30px' } }, isoWeek(d0)));
        for (let i = 0; i < 7; i++) {
          const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i, 12), v = iso(d), isSel = v === sel, isT = v === today, out = d.getMonth() !== mo;
          cells.push(e('button', { key: i, type: 'button', className: 'fdp-day', onMouseDown: (ev) => ev.preventDefault(), onClick: (ev) => { ev.stopPropagation(); this.pick(v); },
            style: Object.assign({}, btn, { width: 30, height: 30, borderRadius: 15, fontSize: 12, fontVariantNumeric: 'tabular-nums',
              background: isSel ? '#0031EB' : 'transparent', color: isSel ? '#fff' : (out ? '#C9C4BA' : (i > 4 ? '#6E675F' : '#231F20')),
              fontWeight: isSel || isT ? 600 : 400, boxShadow: isT && !isSel ? 'inset 0 0 0 1px #0031EB' : 'none' }) }, d.getDate()));
        }
        rows.push(e('div', { key: w, style: { display: 'flex', alignItems: 'center' } }, cells));
      }
      const head = e('div', { style: { display: 'flex', alignItems: 'center', margin: '0 0 6px' } },
        e('button', { type: 'button', className: 'fdp-nav', onMouseDown: nav(-1), style: Object.assign({}, btn, { width: 26, height: 26, borderRadius: 4, fontSize: 14, color: '#6E675F' }) }, '‹'),
        e('div', { style: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#231F20' } }, MON[mo].charAt(0).toUpperCase() + MON[mo].slice(1) + ' ' + y),
        e('button', { type: 'button', className: 'fdp-nav', onMouseDown: nav(1), style: Object.assign({}, btn, { width: 26, height: 26, borderRadius: 4, fontSize: 14, color: '#6E675F' }) }, '›'));
      const wd = e('div', { style: { display: 'flex', fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: '#9C948B', marginBottom: 2 } },
        e('div', { style: { width: 22, textAlign: 'center' } }, 'UGE'), ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((x, i) => e('div', { key: i, style: { width: 30, textAlign: 'center' } }, x)));
      const foot = e('div', { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EFECE6', marginTop: 6, paddingTop: 8 } },
        e('button', { type: 'button', className: 'fdp-link', onMouseDown: (ev) => ev.preventDefault(), onClick: (ev) => { ev.stopPropagation(); this.pick(''); }, style: Object.assign({}, btn, { fontSize: 12, color: '#6E675F' }) }, 'Ryd'),
        e('button', { type: 'button', className: 'fdp-link', onMouseDown: (ev) => ev.preventDefault(), onClick: (ev) => { ev.stopPropagation(); this.pick(today); }, style: Object.assign({}, btn, { fontSize: 12, fontWeight: 600, color: '#0031EB' }) }, 'I dag'));
      const box = e('div', { ref: this.pop, onClick: (ev) => ev.stopPropagation(), onMouseDown: (ev) => ev.stopPropagation(),
        style: { position: 'fixed', left: this.state.pos.left, top: this.state.pos.top, zIndex: 10000, width: 252, boxSizing: 'border-box', background: '#fff',
          border: '1px solid #DFDBD3', borderRadius: 8, boxShadow: '0 10px 30px rgba(35,31,32,.16)', padding: 10, fontFamily: this.state.font } }, head, wd, rows, foot);
      return window.ReactDOM.createPortal(box, document.body);
    }
    render() {
      const p = this.props, st = Object.assign({}, p.style || {});
      const shown = this.state.text !== null ? this.state.text : fmt(p.value);
      const input = e('input', { ref: this.ref, type: 'text', inputMode: 'numeric', value: shown, placeholder: 'dd.mm.åååå', className: p.className, style: st, title: p.title,
        onMouseDown: () => this.openIt(),
        onClick: (ev) => { if (p.onClick && p.onClick !== undefined) { try { ev.stopPropagation(); } catch (x) {} } },
        onFocus: () => this.openIt(),
        onChange: (ev) => this.setState({ text: ev.target.value }),
        onBlur: () => this.commitText(),
        onKeyDown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); this.commitText(); this.close(); ev.target.blur(); } } });
      return e(React.Fragment, null, input, this.state.open ? this.renderPop() : null);
    }
  }
  const css = document.createElement('style');
  css.textContent = '.fdp-day:hover{background:#EDF1FD!important;color:#0031EB!important}.fdp-nav:hover{background:#F2F0EC!important;color:#231F20!important}.fdp-link:hover{text-decoration:underline}';
  document.head.appendChild(css);
  window.FlowDate = FlowDate;
  window.DCLogic = DCLogic;
  window.FlowHost = Host;
})();

;
/* @kenjiuno/msgreader (Apache-2.0) – læser Outlook .msg-filer. Bundlet med esbuild. */
(()=>{var je=Object.create;var wt=Object.defineProperty;var Ve=Object.getOwnPropertyDescriptor;var Ze=Object.getOwnPropertyNames;var We=Object.getPrototypeOf,qe=Object.prototype.hasOwnProperty;var zt=(r,t,e)=>()=>{if(e)throw e[0];try{return r&&(t=r(r=0)),t}catch(i){throw e=[i],i}};var L=(r,t)=>()=>{try{return t||r((t={exports:{}}).exports,t),t.exports}catch(e){throw t=0,e}},ze=(r,t)=>{for(var e in t)wt(r,e,{get:t[e],enumerable:!0})},Kt=(r,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of Ze(t))!qe.call(r,n)&&n!==e&&wt(r,n,{get:()=>t[n],enumerable:!(i=Ve(t,n))||i.enumerable});return r};var $t=(r,t,e)=>(e=r!=null?je(We(r)):{},Kt(t||!r||!r.__esModule?wt(e,"default",{value:r,enumerable:!0}):e,r)),Ke=r=>Kt(wt({},"__esModule",{value:!0}),r);var Qt=L(mt=>{"use strict";w();mt.byteLength=Xe;mt.toByteArray=Qe;mt.fromByteArray=rr;var G=[],C=[],$e=typeof Uint8Array<"u"?Uint8Array:Array,Ut="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(J=0,Xt=Ut.length;J<Xt;++J)G[J]=Ut[J],C[Ut.charCodeAt(J)]=J;var J,Xt;C[45]=62;C[95]=63;function Jt(r){var t=r.length;if(t%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var e=r.indexOf("=");e===-1&&(e=t);var i=e===t?0:4-e%4;return[e,i]}function Xe(r){var t=Jt(r),e=t[0],i=t[1];return(e+i)*3/4-i}function Je(r,t,e){return(t+e)*3/4-e}function Qe(r){var t,e=Jt(r),i=e[0],n=e[1],a=new $e(Je(r,i,n)),o=0,s=n>0?i-4:i,f;for(f=0;f<s;f+=4)t=C[r.charCodeAt(f)]<<18|C[r.charCodeAt(f+1)]<<12|C[r.charCodeAt(f+2)]<<6|C[r.charCodeAt(f+3)],a[o++]=t>>16&255,a[o++]=t>>8&255,a[o++]=t&255;return n===2&&(t=C[r.charCodeAt(f)]<<2|C[r.charCodeAt(f+1)]>>4,a[o++]=t&255),n===1&&(t=C[r.charCodeAt(f)]<<10|C[r.charCodeAt(f+1)]<<4|C[r.charCodeAt(f+2)]>>2,a[o++]=t>>8&255,a[o++]=t&255),a}function tr(r){return G[r>>18&63]+G[r>>12&63]+G[r>>6&63]+G[r&63]}function er(r,t,e){for(var i,n=[],a=t;a<e;a+=3)i=(r[a]<<16&16711680)+(r[a+1]<<8&65280)+(r[a+2]&255),n.push(tr(i));return n.join("")}function rr(r){for(var t,e=r.length,i=e%3,n=[],a=16383,o=0,s=e-i;o<s;o+=a)n.push(er(r,o,o+a>s?s:o+a));return i===1?(t=r[e-1],n.push(G[t>>2]+G[t<<4&63]+"==")):i===2&&(t=(r[e-2]<<8)+r[e-1],n.push(G[t>>10]+G[t>>4&63]+G[t<<2&63]+"=")),n.join("")}});var te=L(St=>{w();St.read=function(r,t,e,i,n){var a,o,s=n*8-i-1,f=(1<<s)-1,h=f>>1,p=-7,l=e?n-1:0,y=e?-1:1,d=r[t+l];for(l+=y,a=d&(1<<-p)-1,d>>=-p,p+=s;p>0;a=a*256+r[t+l],l+=y,p-=8);for(o=a&(1<<-p)-1,a>>=-p,p+=i;p>0;o=o*256+r[t+l],l+=y,p-=8);if(a===0)a=1-h;else{if(a===f)return o?NaN:(d?-1:1)*(1/0);o=o+Math.pow(2,i),a=a-h}return(d?-1:1)*o*Math.pow(2,a-i)};St.write=function(r,t,e,i,n,a){var o,s,f,h=a*8-n-1,p=(1<<h)-1,l=p>>1,y=n===23?Math.pow(2,-24)-Math.pow(2,-77):0,d=i?0:a-1,A=i?1:-1,T=t<0||t===0&&1/t<0?1:0;for(t=Math.abs(t),isNaN(t)||t===1/0?(s=isNaN(t)?1:0,o=p):(o=Math.floor(Math.log(t)/Math.LN2),t*(f=Math.pow(2,-o))<1&&(o--,f*=2),o+l>=1?t+=y/f:t+=y*Math.pow(2,1-l),t*f>=2&&(o++,f/=2),o+l>=p?(s=0,o=p):o+l>=1?(s=(t*f-1)*Math.pow(2,n),o=o+l):(s=t*Math.pow(2,l-1)*Math.pow(2,n),o=0));n>=8;r[e+d]=s&255,d+=A,s/=256,n-=8);for(o=o<<n|s,h+=n;h>0;r[e+d]=o&255,d+=A,o/=256,h-=8);r[e+d-A]|=T*128}});var Ae=L(ot=>{"use strict";w();var Nt=Qt(),nt=te(),ee=typeof Symbol=="function"&&typeof Symbol.for=="function"?Symbol.for("nodejs.util.inspect.custom"):null;ot.Buffer=u;ot.SlowBuffer=ur;ot.INSPECT_MAX_BYTES=50;var Tt=2147483647;ot.kMaxLength=Tt;u.TYPED_ARRAY_SUPPORT=ir();!u.TYPED_ARRAY_SUPPORT&&typeof console<"u"&&typeof console.error=="function"&&console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");function ir(){try{let r=new Uint8Array(1),t={foo:function(){return 42}};return Object.setPrototypeOf(t,Uint8Array.prototype),Object.setPrototypeOf(r,t),r.foo()===42}catch{return!1}}Object.defineProperty(u.prototype,"parent",{enumerable:!0,get:function(){if(u.isBuffer(this))return this.buffer}});Object.defineProperty(u.prototype,"offset",{enumerable:!0,get:function(){if(u.isBuffer(this))return this.byteOffset}});function Z(r){if(r>Tt)throw new RangeError('The value "'+r+'" is invalid for option "size"');let t=new Uint8Array(r);return Object.setPrototypeOf(t,u.prototype),t}function u(r,t,e){if(typeof r=="number"){if(typeof t=="string")throw new TypeError('The "string" argument must be of type string. Received type number');return Rt(r)}return ae(r,t,e)}u.poolSize=8192;function ae(r,t,e){if(typeof r=="string")return ar(r,t);if(ArrayBuffer.isView(r))return or(r);if(r==null)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof r);if(Y(r,ArrayBuffer)||r&&Y(r.buffer,ArrayBuffer)||typeof SharedArrayBuffer<"u"&&(Y(r,SharedArrayBuffer)||r&&Y(r.buffer,SharedArrayBuffer)))return Lt(r,t,e);if(typeof r=="number")throw new TypeError('The "value" argument must not be of type number. Received type number');let i=r.valueOf&&r.valueOf();if(i!=null&&i!==r)return u.from(i,t,e);let n=sr(r);if(n)return n;if(typeof Symbol<"u"&&Symbol.toPrimitive!=null&&typeof r[Symbol.toPrimitive]=="function")return u.from(r[Symbol.toPrimitive]("string"),t,e);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof r)}u.from=function(r,t,e){return ae(r,t,e)};Object.setPrototypeOf(u.prototype,Uint8Array.prototype);Object.setPrototypeOf(u,Uint8Array);function oe(r){if(typeof r!="number")throw new TypeError('"size" argument must be of type number');if(r<0)throw new RangeError('The value "'+r+'" is invalid for option "size"')}function nr(r,t,e){return oe(r),r<=0?Z(r):t!==void 0?typeof e=="string"?Z(r).fill(t,e):Z(r).fill(t):Z(r)}u.alloc=function(r,t,e){return nr(r,t,e)};function Rt(r){return oe(r),Z(r<0?0:Ot(r)|0)}u.allocUnsafe=function(r){return Rt(r)};u.allocUnsafeSlow=function(r){return Rt(r)};function ar(r,t){if((typeof t!="string"||t==="")&&(t="utf8"),!u.isEncoding(t))throw new TypeError("Unknown encoding: "+t);let e=se(r,t)|0,i=Z(e),n=i.write(r,t);return n!==e&&(i=i.slice(0,n)),i}function Bt(r){let t=r.length<0?0:Ot(r.length)|0,e=Z(t);for(let i=0;i<t;i+=1)e[i]=r[i]&255;return e}function or(r){if(Y(r,Uint8Array)){let t=new Uint8Array(r);return Lt(t.buffer,t.byteOffset,t.byteLength)}return Bt(r)}function Lt(r,t,e){if(t<0||r.byteLength<t)throw new RangeError('"offset" is outside of buffer bounds');if(r.byteLength<t+(e||0))throw new RangeError('"length" is outside of buffer bounds');let i;return t===void 0&&e===void 0?i=new Uint8Array(r):e===void 0?i=new Uint8Array(r,t):i=new Uint8Array(r,t,e),Object.setPrototypeOf(i,u.prototype),i}function sr(r){if(u.isBuffer(r)){let t=Ot(r.length)|0,e=Z(t);return e.length===0||r.copy(e,0,0,t),e}if(r.length!==void 0)return typeof r.length!="number"||Ft(r.length)?Z(0):Bt(r);if(r.type==="Buffer"&&Array.isArray(r.data))return Bt(r.data)}function Ot(r){if(r>=Tt)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+Tt.toString(16)+" bytes");return r|0}function ur(r){return+r!=r&&(r=0),u.alloc(+r)}u.isBuffer=function(t){return t!=null&&t._isBuffer===!0&&t!==u.prototype};u.compare=function(t,e){if(Y(t,Uint8Array)&&(t=u.from(t,t.offset,t.byteLength)),Y(e,Uint8Array)&&(e=u.from(e,e.offset,e.byteLength)),!u.isBuffer(t)||!u.isBuffer(e))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(t===e)return 0;let i=t.length,n=e.length;for(let a=0,o=Math.min(i,n);a<o;++a)if(t[a]!==e[a]){i=t[a],n=e[a];break}return i<n?-1:n<i?1:0};u.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}};u.concat=function(t,e){if(!Array.isArray(t))throw new TypeError('"list" argument must be an Array of Buffers');if(t.length===0)return u.alloc(0);let i;if(e===void 0)for(e=0,i=0;i<t.length;++i)e+=t[i].length;let n=u.allocUnsafe(e),a=0;for(i=0;i<t.length;++i){let o=t[i];if(Y(o,Uint8Array))a+o.length>n.length?(u.isBuffer(o)||(o=u.from(o)),o.copy(n,a)):Uint8Array.prototype.set.call(n,o,a);else if(u.isBuffer(o))o.copy(n,a);else throw new TypeError('"list" argument must be an Array of Buffers');a+=o.length}return n};function se(r,t){if(u.isBuffer(r))return r.length;if(ArrayBuffer.isView(r)||Y(r,ArrayBuffer))return r.byteLength;if(typeof r!="string")throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof r);let e=r.length,i=arguments.length>2&&arguments[2]===!0;if(!i&&e===0)return 0;let n=!1;for(;;)switch(t){case"ascii":case"latin1":case"binary":return e;case"utf8":case"utf-8":return xt(r).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return e*2;case"hex":return e>>>1;case"base64":return Ee(r).length;default:if(n)return i?-1:xt(r).length;t=(""+t).toLowerCase(),n=!0}}u.byteLength=se;function fr(r,t,e){let i=!1;if((t===void 0||t<0)&&(t=0),t>this.length||((e===void 0||e>this.length)&&(e=this.length),e<=0)||(e>>>=0,t>>>=0,e<=t))return"";for(r||(r="utf8");;)switch(r){case"hex":return Ir(this,t,e);case"utf8":case"utf-8":return fe(this,t,e);case"ascii":return Ar(this,t,e);case"latin1":case"binary":return _r(this,t,e);case"base64":return yr(this,t,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return wr(this,t,e);default:if(i)throw new TypeError("Unknown encoding: "+r);r=(r+"").toLowerCase(),i=!0}}u.prototype._isBuffer=!0;function Q(r,t,e){let i=r[t];r[t]=r[e],r[e]=i}u.prototype.swap16=function(){let t=this.length;if(t%2!==0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(let e=0;e<t;e+=2)Q(this,e,e+1);return this};u.prototype.swap32=function(){let t=this.length;if(t%4!==0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(let e=0;e<t;e+=4)Q(this,e,e+3),Q(this,e+1,e+2);return this};u.prototype.swap64=function(){let t=this.length;if(t%8!==0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(let e=0;e<t;e+=8)Q(this,e,e+7),Q(this,e+1,e+6),Q(this,e+2,e+5),Q(this,e+3,e+4);return this};u.prototype.toString=function(){let t=this.length;return t===0?"":arguments.length===0?fe(this,0,t):fr.apply(this,arguments)};u.prototype.toLocaleString=u.prototype.toString;u.prototype.equals=function(t){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t?!0:u.compare(this,t)===0};u.prototype.inspect=function(){let t="",e=ot.INSPECT_MAX_BYTES;return t=this.toString("hex",0,e).replace(/(.{2})/g,"$1 ").trim(),this.length>e&&(t+=" ... "),"<Buffer "+t+">"};ee&&(u.prototype[ee]=u.prototype.inspect);u.prototype.compare=function(t,e,i,n,a){if(Y(t,Uint8Array)&&(t=u.from(t,t.offset,t.byteLength)),!u.isBuffer(t))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof t);if(e===void 0&&(e=0),i===void 0&&(i=t?t.length:0),n===void 0&&(n=0),a===void 0&&(a=this.length),e<0||i>t.length||n<0||a>this.length)throw new RangeError("out of range index");if(n>=a&&e>=i)return 0;if(n>=a)return-1;if(e>=i)return 1;if(e>>>=0,i>>>=0,n>>>=0,a>>>=0,this===t)return 0;let o=a-n,s=i-e,f=Math.min(o,s),h=this.slice(n,a),p=t.slice(e,i);for(let l=0;l<f;++l)if(h[l]!==p[l]){o=h[l],s=p[l];break}return o<s?-1:s<o?1:0};function ue(r,t,e,i,n){if(r.length===0)return-1;if(typeof e=="string"?(i=e,e=0):e>2147483647?e=2147483647:e<-2147483648&&(e=-2147483648),e=+e,Ft(e)&&(e=n?0:r.length-1),e<0&&(e=r.length+e),e>=r.length){if(n)return-1;e=r.length-1}else if(e<0)if(n)e=0;else return-1;if(typeof t=="string"&&(t=u.from(t,i)),u.isBuffer(t))return t.length===0?-1:re(r,t,e,i,n);if(typeof t=="number")return t=t&255,typeof Uint8Array.prototype.indexOf=="function"?n?Uint8Array.prototype.indexOf.call(r,t,e):Uint8Array.prototype.lastIndexOf.call(r,t,e):re(r,[t],e,i,n);throw new TypeError("val must be string, number or Buffer")}function re(r,t,e,i,n){let a=1,o=r.length,s=t.length;if(i!==void 0&&(i=String(i).toLowerCase(),i==="ucs2"||i==="ucs-2"||i==="utf16le"||i==="utf-16le")){if(r.length<2||t.length<2)return-1;a=2,o/=2,s/=2,e/=2}function f(p,l){return a===1?p[l]:p.readUInt16BE(l*a)}let h;if(n){let p=-1;for(h=e;h<o;h++)if(f(r,h)===f(t,p===-1?0:h-p)){if(p===-1&&(p=h),h-p+1===s)return p*a}else p!==-1&&(h-=h-p),p=-1}else for(e+s>o&&(e=o-s),h=e;h>=0;h--){let p=!0;for(let l=0;l<s;l++)if(f(r,h+l)!==f(t,l)){p=!1;break}if(p)return h}return-1}u.prototype.includes=function(t,e,i){return this.indexOf(t,e,i)!==-1};u.prototype.indexOf=function(t,e,i){return ue(this,t,e,i,!0)};u.prototype.lastIndexOf=function(t,e,i){return ue(this,t,e,i,!1)};function hr(r,t,e,i){e=Number(e)||0;let n=r.length-e;i?(i=Number(i),i>n&&(i=n)):i=n;let a=t.length;i>a/2&&(i=a/2);let o;for(o=0;o<i;++o){let s=parseInt(t.substr(o*2,2),16);if(Ft(s))return o;r[e+o]=s}return o}function pr(r,t,e,i){return bt(xt(t,r.length-e),r,e,i)}function lr(r,t,e,i){return bt(vr(t),r,e,i)}function cr(r,t,e,i){return bt(Ee(t),r,e,i)}function dr(r,t,e,i){return bt(gr(t,r.length-e),r,e,i)}u.prototype.write=function(t,e,i,n){if(e===void 0)n="utf8",i=this.length,e=0;else if(i===void 0&&typeof e=="string")n=e,i=this.length,e=0;else if(isFinite(e))e=e>>>0,isFinite(i)?(i=i>>>0,n===void 0&&(n="utf8")):(n=i,i=void 0);else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");let a=this.length-e;if((i===void 0||i>a)&&(i=a),t.length>0&&(i<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");let o=!1;for(;;)switch(n){case"hex":return hr(this,t,e,i);case"utf8":case"utf-8":return pr(this,t,e,i);case"ascii":case"latin1":case"binary":return lr(this,t,e,i);case"base64":return cr(this,t,e,i);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return dr(this,t,e,i);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}};u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};function yr(r,t,e){return t===0&&e===r.length?Nt.fromByteArray(r):Nt.fromByteArray(r.slice(t,e))}function fe(r,t,e){e=Math.min(r.length,e);let i=[],n=t;for(;n<e;){let a=r[n],o=null,s=a>239?4:a>223?3:a>191?2:1;if(n+s<=e){let f,h,p,l;switch(s){case 1:a<128&&(o=a);break;case 2:f=r[n+1],(f&192)===128&&(l=(a&31)<<6|f&63,l>127&&(o=l));break;case 3:f=r[n+1],h=r[n+2],(f&192)===128&&(h&192)===128&&(l=(a&15)<<12|(f&63)<<6|h&63,l>2047&&(l<55296||l>57343)&&(o=l));break;case 4:f=r[n+1],h=r[n+2],p=r[n+3],(f&192)===128&&(h&192)===128&&(p&192)===128&&(l=(a&15)<<18|(f&63)<<12|(h&63)<<6|p&63,l>65535&&l<1114112&&(o=l))}}o===null?(o=65533,s=1):o>65535&&(o-=65536,i.push(o>>>10&1023|55296),o=56320|o&1023),i.push(o),n+=s}return Er(i)}var ie=4096;function Er(r){let t=r.length;if(t<=ie)return String.fromCharCode.apply(String,r);let e="",i=0;for(;i<t;)e+=String.fromCharCode.apply(String,r.slice(i,i+=ie));return e}function Ar(r,t,e){let i="";e=Math.min(r.length,e);for(let n=t;n<e;++n)i+=String.fromCharCode(r[n]&127);return i}function _r(r,t,e){let i="";e=Math.min(r.length,e);for(let n=t;n<e;++n)i+=String.fromCharCode(r[n]);return i}function Ir(r,t,e){let i=r.length;(!t||t<0)&&(t=0),(!e||e<0||e>i)&&(e=i);let n="";for(let a=t;a<e;++a)n+=Ur[r[a]];return n}function wr(r,t,e){let i=r.slice(t,e),n="";for(let a=0;a<i.length-1;a+=2)n+=String.fromCharCode(i[a]+i[a+1]*256);return n}u.prototype.slice=function(t,e){let i=this.length;t=~~t,e=e===void 0?i:~~e,t<0?(t+=i,t<0&&(t=0)):t>i&&(t=i),e<0?(e+=i,e<0&&(e=0)):e>i&&(e=i),e<t&&(e=t);let n=this.subarray(t,e);return Object.setPrototypeOf(n,u.prototype),n};function v(r,t,e){if(r%1!==0||r<0)throw new RangeError("offset is not uint");if(r+t>e)throw new RangeError("Trying to access beyond buffer length")}u.prototype.readUintLE=u.prototype.readUIntLE=function(t,e,i){t=t>>>0,e=e>>>0,i||v(t,e,this.length);let n=this[t],a=1,o=0;for(;++o<e&&(a*=256);)n+=this[t+o]*a;return n};u.prototype.readUintBE=u.prototype.readUIntBE=function(t,e,i){t=t>>>0,e=e>>>0,i||v(t,e,this.length);let n=this[t+--e],a=1;for(;e>0&&(a*=256);)n+=this[t+--e]*a;return n};u.prototype.readUint8=u.prototype.readUInt8=function(t,e){return t=t>>>0,e||v(t,1,this.length),this[t]};u.prototype.readUint16LE=u.prototype.readUInt16LE=function(t,e){return t=t>>>0,e||v(t,2,this.length),this[t]|this[t+1]<<8};u.prototype.readUint16BE=u.prototype.readUInt16BE=function(t,e){return t=t>>>0,e||v(t,2,this.length),this[t]<<8|this[t+1]};u.prototype.readUint32LE=u.prototype.readUInt32LE=function(t,e){return t=t>>>0,e||v(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+this[t+3]*16777216};u.prototype.readUint32BE=u.prototype.readUInt32BE=function(t,e){return t=t>>>0,e||v(t,4,this.length),this[t]*16777216+(this[t+1]<<16|this[t+2]<<8|this[t+3])};u.prototype.readBigUInt64LE=z(function(t){t=t>>>0,at(t,"offset");let e=this[t],i=this[t+7];(e===void 0||i===void 0)&&yt(t,this.length-8);let n=e+this[++t]*2**8+this[++t]*2**16+this[++t]*2**24,a=this[++t]+this[++t]*2**8+this[++t]*2**16+i*2**24;return BigInt(n)+(BigInt(a)<<BigInt(32))});u.prototype.readBigUInt64BE=z(function(t){t=t>>>0,at(t,"offset");let e=this[t],i=this[t+7];(e===void 0||i===void 0)&&yt(t,this.length-8);let n=e*2**24+this[++t]*2**16+this[++t]*2**8+this[++t],a=this[++t]*2**24+this[++t]*2**16+this[++t]*2**8+i;return(BigInt(n)<<BigInt(32))+BigInt(a)});u.prototype.readIntLE=function(t,e,i){t=t>>>0,e=e>>>0,i||v(t,e,this.length);let n=this[t],a=1,o=0;for(;++o<e&&(a*=256);)n+=this[t+o]*a;return a*=128,n>=a&&(n-=Math.pow(2,8*e)),n};u.prototype.readIntBE=function(t,e,i){t=t>>>0,e=e>>>0,i||v(t,e,this.length);let n=e,a=1,o=this[t+--n];for(;n>0&&(a*=256);)o+=this[t+--n]*a;return a*=128,o>=a&&(o-=Math.pow(2,8*e)),o};u.prototype.readInt8=function(t,e){return t=t>>>0,e||v(t,1,this.length),this[t]&128?(255-this[t]+1)*-1:this[t]};u.prototype.readInt16LE=function(t,e){t=t>>>0,e||v(t,2,this.length);let i=this[t]|this[t+1]<<8;return i&32768?i|4294901760:i};u.prototype.readInt16BE=function(t,e){t=t>>>0,e||v(t,2,this.length);let i=this[t+1]|this[t]<<8;return i&32768?i|4294901760:i};u.prototype.readInt32LE=function(t,e){return t=t>>>0,e||v(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24};u.prototype.readInt32BE=function(t,e){return t=t>>>0,e||v(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]};u.prototype.readBigInt64LE=z(function(t){t=t>>>0,at(t,"offset");let e=this[t],i=this[t+7];(e===void 0||i===void 0)&&yt(t,this.length-8);let n=this[t+4]+this[t+5]*2**8+this[t+6]*2**16+(i<<24);return(BigInt(n)<<BigInt(32))+BigInt(e+this[++t]*2**8+this[++t]*2**16+this[++t]*2**24)});u.prototype.readBigInt64BE=z(function(t){t=t>>>0,at(t,"offset");let e=this[t],i=this[t+7];(e===void 0||i===void 0)&&yt(t,this.length-8);let n=(e<<24)+this[++t]*2**16+this[++t]*2**8+this[++t];return(BigInt(n)<<BigInt(32))+BigInt(this[++t]*2**24+this[++t]*2**16+this[++t]*2**8+i)});u.prototype.readFloatLE=function(t,e){return t=t>>>0,e||v(t,4,this.length),nt.read(this,t,!0,23,4)};u.prototype.readFloatBE=function(t,e){return t=t>>>0,e||v(t,4,this.length),nt.read(this,t,!1,23,4)};u.prototype.readDoubleLE=function(t,e){return t=t>>>0,e||v(t,8,this.length),nt.read(this,t,!0,52,8)};u.prototype.readDoubleBE=function(t,e){return t=t>>>0,e||v(t,8,this.length),nt.read(this,t,!1,52,8)};function O(r,t,e,i,n,a){if(!u.isBuffer(r))throw new TypeError('"buffer" argument must be a Buffer instance');if(t>n||t<a)throw new RangeError('"value" argument is out of bounds');if(e+i>r.length)throw new RangeError("Index out of range")}u.prototype.writeUintLE=u.prototype.writeUIntLE=function(t,e,i,n){if(t=+t,e=e>>>0,i=i>>>0,!n){let s=Math.pow(2,8*i)-1;O(this,t,e,i,s,0)}let a=1,o=0;for(this[e]=t&255;++o<i&&(a*=256);)this[e+o]=t/a&255;return e+i};u.prototype.writeUintBE=u.prototype.writeUIntBE=function(t,e,i,n){if(t=+t,e=e>>>0,i=i>>>0,!n){let s=Math.pow(2,8*i)-1;O(this,t,e,i,s,0)}let a=i-1,o=1;for(this[e+a]=t&255;--a>=0&&(o*=256);)this[e+a]=t/o&255;return e+i};u.prototype.writeUint8=u.prototype.writeUInt8=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,1,255,0),this[e]=t&255,e+1};u.prototype.writeUint16LE=u.prototype.writeUInt16LE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,2,65535,0),this[e]=t&255,this[e+1]=t>>>8,e+2};u.prototype.writeUint16BE=u.prototype.writeUInt16BE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,2,65535,0),this[e]=t>>>8,this[e+1]=t&255,e+2};u.prototype.writeUint32LE=u.prototype.writeUInt32LE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,4,4294967295,0),this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=t&255,e+4};u.prototype.writeUint32BE=u.prototype.writeUInt32BE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,4,4294967295,0),this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=t&255,e+4};function he(r,t,e,i,n){ye(t,i,n,r,e,7);let a=Number(t&BigInt(4294967295));r[e++]=a,a=a>>8,r[e++]=a,a=a>>8,r[e++]=a,a=a>>8,r[e++]=a;let o=Number(t>>BigInt(32)&BigInt(4294967295));return r[e++]=o,o=o>>8,r[e++]=o,o=o>>8,r[e++]=o,o=o>>8,r[e++]=o,e}function pe(r,t,e,i,n){ye(t,i,n,r,e,7);let a=Number(t&BigInt(4294967295));r[e+7]=a,a=a>>8,r[e+6]=a,a=a>>8,r[e+5]=a,a=a>>8,r[e+4]=a;let o=Number(t>>BigInt(32)&BigInt(4294967295));return r[e+3]=o,o=o>>8,r[e+2]=o,o=o>>8,r[e+1]=o,o=o>>8,r[e]=o,e+8}u.prototype.writeBigUInt64LE=z(function(t,e=0){return he(this,t,e,BigInt(0),BigInt("0xffffffffffffffff"))});u.prototype.writeBigUInt64BE=z(function(t,e=0){return pe(this,t,e,BigInt(0),BigInt("0xffffffffffffffff"))});u.prototype.writeIntLE=function(t,e,i,n){if(t=+t,e=e>>>0,!n){let f=Math.pow(2,8*i-1);O(this,t,e,i,f-1,-f)}let a=0,o=1,s=0;for(this[e]=t&255;++a<i&&(o*=256);)t<0&&s===0&&this[e+a-1]!==0&&(s=1),this[e+a]=(t/o>>0)-s&255;return e+i};u.prototype.writeIntBE=function(t,e,i,n){if(t=+t,e=e>>>0,!n){let f=Math.pow(2,8*i-1);O(this,t,e,i,f-1,-f)}let a=i-1,o=1,s=0;for(this[e+a]=t&255;--a>=0&&(o*=256);)t<0&&s===0&&this[e+a+1]!==0&&(s=1),this[e+a]=(t/o>>0)-s&255;return e+i};u.prototype.writeInt8=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,1,127,-128),t<0&&(t=255+t+1),this[e]=t&255,e+1};u.prototype.writeInt16LE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,2,32767,-32768),this[e]=t&255,this[e+1]=t>>>8,e+2};u.prototype.writeInt16BE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,2,32767,-32768),this[e]=t>>>8,this[e+1]=t&255,e+2};u.prototype.writeInt32LE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,4,2147483647,-2147483648),this[e]=t&255,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24,e+4};u.prototype.writeInt32BE=function(t,e,i){return t=+t,e=e>>>0,i||O(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=t&255,e+4};u.prototype.writeBigInt64LE=z(function(t,e=0){return he(this,t,e,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))});u.prototype.writeBigInt64BE=z(function(t,e=0){return pe(this,t,e,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))});function le(r,t,e,i,n,a){if(e+i>r.length)throw new RangeError("Index out of range");if(e<0)throw new RangeError("Index out of range")}function ce(r,t,e,i,n){return t=+t,e=e>>>0,n||le(r,t,e,4,34028234663852886e22,-34028234663852886e22),nt.write(r,t,e,i,23,4),e+4}u.prototype.writeFloatLE=function(t,e,i){return ce(this,t,e,!0,i)};u.prototype.writeFloatBE=function(t,e,i){return ce(this,t,e,!1,i)};function de(r,t,e,i,n){return t=+t,e=e>>>0,n||le(r,t,e,8,17976931348623157e292,-17976931348623157e292),nt.write(r,t,e,i,52,8),e+8}u.prototype.writeDoubleLE=function(t,e,i){return de(this,t,e,!0,i)};u.prototype.writeDoubleBE=function(t,e,i){return de(this,t,e,!1,i)};u.prototype.copy=function(t,e,i,n){if(!u.isBuffer(t))throw new TypeError("argument should be a Buffer");if(i||(i=0),!n&&n!==0&&(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&n<i&&(n=i),n===i||t.length===0||this.length===0)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(i<0||i>=this.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-i&&(n=t.length-e+i);let a=n-i;return this===t&&typeof Uint8Array.prototype.copyWithin=="function"?this.copyWithin(e,i,n):Uint8Array.prototype.set.call(t,this.subarray(i,n),e),a};u.prototype.fill=function(t,e,i,n){if(typeof t=="string"){if(typeof e=="string"?(n=e,e=0,i=this.length):typeof i=="string"&&(n=i,i=this.length),n!==void 0&&typeof n!="string")throw new TypeError("encoding must be a string");if(typeof n=="string"&&!u.isEncoding(n))throw new TypeError("Unknown encoding: "+n);if(t.length===1){let o=t.charCodeAt(0);(n==="utf8"&&o<128||n==="latin1")&&(t=o)}}else typeof t=="number"?t=t&255:typeof t=="boolean"&&(t=Number(t));if(e<0||this.length<e||this.length<i)throw new RangeError("Out of range index");if(i<=e)return this;e=e>>>0,i=i===void 0?this.length:i>>>0,t||(t=0);let a;if(typeof t=="number")for(a=e;a<i;++a)this[a]=t;else{let o=u.isBuffer(t)?t:u.from(t,n),s=o.length;if(s===0)throw new TypeError('The value "'+t+'" is invalid for argument "value"');for(a=0;a<i-e;++a)this[a+e]=o[a%s]}return this};var it={};function Dt(r,t,e){it[r]=class extends e{constructor(){super(),Object.defineProperty(this,"message",{value:t.apply(this,arguments),writable:!0,configurable:!0}),this.name=`${this.name} [${r}]`,this.stack,delete this.name}get code(){return r}set code(n){Object.defineProperty(this,"code",{configurable:!0,enumerable:!0,value:n,writable:!0})}toString(){return`${this.name} [${r}]: ${this.message}`}}}Dt("ERR_BUFFER_OUT_OF_BOUNDS",function(r){return r?`${r} is outside of buffer bounds`:"Attempt to access memory outside buffer bounds"},RangeError);Dt("ERR_INVALID_ARG_TYPE",function(r,t){return`The "${r}" argument must be of type number. Received type ${typeof t}`},TypeError);Dt("ERR_OUT_OF_RANGE",function(r,t,e){let i=`The value of "${r}" is out of range.`,n=e;return Number.isInteger(e)&&Math.abs(e)>2**32?n=ne(String(e)):typeof e=="bigint"&&(n=String(e),(e>BigInt(2)**BigInt(32)||e<-(BigInt(2)**BigInt(32)))&&(n=ne(n)),n+="n"),i+=` It must be ${t}. Received ${n}`,i},RangeError);function ne(r){let t="",e=r.length,i=r[0]==="-"?1:0;for(;e>=i+4;e-=3)t=`_${r.slice(e-3,e)}${t}`;return`${r.slice(0,e)}${t}`}function mr(r,t,e){at(t,"offset"),(r[t]===void 0||r[t+e]===void 0)&&yt(t,r.length-(e+1))}function ye(r,t,e,i,n,a){if(r>e||r<t){let o=typeof t=="bigint"?"n":"",s;throw a>3?t===0||t===BigInt(0)?s=`>= 0${o} and < 2${o} ** ${(a+1)*8}${o}`:s=`>= -(2${o} ** ${(a+1)*8-1}${o}) and < 2 ** ${(a+1)*8-1}${o}`:s=`>= ${t}${o} and <= ${e}${o}`,new it.ERR_OUT_OF_RANGE("value",s,r)}mr(i,n,a)}function at(r,t){if(typeof r!="number")throw new it.ERR_INVALID_ARG_TYPE(t,"number",r)}function yt(r,t,e){throw Math.floor(r)!==r?(at(r,e),new it.ERR_OUT_OF_RANGE(e||"offset","an integer",r)):t<0?new it.ERR_BUFFER_OUT_OF_BOUNDS:new it.ERR_OUT_OF_RANGE(e||"offset",`>= ${e?1:0} and <= ${t}`,r)}var Tr=/[^+/0-9A-Za-z-_]/g;function br(r){if(r=r.split("=")[0],r=r.trim().replace(Tr,""),r.length<2)return"";for(;r.length%4!==0;)r=r+"=";return r}function xt(r,t){t=t||1/0;let e,i=r.length,n=null,a=[];for(let o=0;o<i;++o){if(e=r.charCodeAt(o),e>55295&&e<57344){if(!n){if(e>56319){(t-=3)>-1&&a.push(239,191,189);continue}else if(o+1===i){(t-=3)>-1&&a.push(239,191,189);continue}n=e;continue}if(e<56320){(t-=3)>-1&&a.push(239,191,189),n=e;continue}e=(n-55296<<10|e-56320)+65536}else n&&(t-=3)>-1&&a.push(239,191,189);if(n=null,e<128){if((t-=1)<0)break;a.push(e)}else if(e<2048){if((t-=2)<0)break;a.push(e>>6|192,e&63|128)}else if(e<65536){if((t-=3)<0)break;a.push(e>>12|224,e>>6&63|128,e&63|128)}else if(e<1114112){if((t-=4)<0)break;a.push(e>>18|240,e>>12&63|128,e>>6&63|128,e&63|128)}else throw new Error("Invalid code point")}return a}function vr(r){let t=[];for(let e=0;e<r.length;++e)t.push(r.charCodeAt(e)&255);return t}function gr(r,t){let e,i,n,a=[];for(let o=0;o<r.length&&!((t-=2)<0);++o)e=r.charCodeAt(o),i=e>>8,n=e%256,a.push(n),a.push(i);return a}function Ee(r){return Nt.toByteArray(br(r))}function bt(r,t,e,i){let n;for(n=0;n<i&&!(n+e>=t.length||n>=r.length);++n)t[n+e]=r[n];return n}function Y(r,t){return r instanceof t||r!=null&&r.constructor!=null&&r.constructor.name!=null&&r.constructor.name===t.name}function Ft(r){return r!==r}var Ur=(function(){let r="0123456789abcdef",t=new Array(256);for(let e=0;e<16;++e){let i=e*16;for(let n=0;n<16;++n)t[i+n]=r[e]+r[n]}return t})();function z(r){return typeof BigInt>"u"?Sr:r}function Sr(){throw new Error("BigInt not supported")}});var S,w=zt(()=>{S=$t(Ae())});var ut=L(F=>{"use strict";w();Object.defineProperty(F,"__esModule",{value:!0});F.arraysEqual=Nr;F.uInt2int=Br;F.toHexStr=Lr;F.toHex1=g;F.toHex2=xr;F.toHex4=Rr;F.msftUuidStringify=Or;F.emptyToNull=Dr;F.readSystemTime=Fr;F.readTransitionSystemTime=Mr;F.bin2HexUpper=Pr;function Nr(r,t){if(r===t)return!0;if(r==null||t==null||r.length!=t.length)return!1;for(var e=0;e<r.length;e++)if(r[e]!==t[e])return!1;return!0}function Br(r){for(var t=new Array(r.length),e=0;e<r.length;e++)t[e]=r[e]<<24>>24;return t}function Lr(r,t){for(var e="";r!=0;)e="0123456789abcdef"[r&15]+e,r>>=4,e="0123456789abcdef"[r&15]+e,r>>=4;for(;e.length<t;)e="0"+e;return e}var D="0123456789abcdef";function g(r){return D[r>>4&15]+D[r&15]}function xr(r){return D[r>>12&15]+D[r>>8&15]+D[r>>4&15]+D[r&15]}function Rr(r){return D[r>>28&15]+D[r>>24&15]+D[r>>20&15]+D[r>>16&15]+D[r>>12&15]+D[r>>8&15]+D[r>>4&15]+D[r&15]}function Or(r,t){return""+g(r[t+3])+g(r[t+2])+g(r[t+1])+g(r[t+0])+"-"+g(r[t+5])+g(r[t+4])+"-"+g(r[t+7])+g(r[t+6])+"-"+g(r[t+8])+g(r[t+9])+"-"+g(r[t+10])+g(r[t+11])+g(r[t+12])+g(r[t+13])+g(r[t+14])+g(r[t+15])}function Dr(r){return r===""?null:r}function st(r,t){return(""+r).padStart(t,"0")}function Fr(r){var t=r.readUint16(),e=r.readUint16(),i=r.readUint16(),n=r.readUint16(),a=r.readUint16(),o=r.readUint16(),s=r.readUint16(),f=r.readUint16(),h="".concat(st(t,4),"-").concat(st(e,2),"-").concat(st(n,2),"T").concat(st(a,2),":").concat(st(o,2),":").concat(st(s,2),"Z");return h==="0000-00-00T00:00:00Z"?null:new Date(h)}function Mr(r){var t=r.readUint16(),e=r.readUint16(),i=r.readUint16(),n=r.readUint16(),a=r.readUint16(),o=r.readUint16(),s=r.readUint16(),f=r.readUint16();return{year:t,month:e,dayOfWeek:i,day:n,hour:a,minute:o}}function Pr(r){for(var t="";!r.isEof();)t+=g(r.readUint8());return t.toUpperCase()}});var vt=L(Mt=>{"use strict";w();Object.defineProperty(Mt,"__esModule",{value:!0});var Cr=ut();Mt.default={FILE_HEADER:(0,Cr.uInt2int)([208,207,17,224,161,177,26,225]),MSG:{UNUSED_BLOCK:-1,END_OF_CHAIN:-2,S_BIG_BLOCK_SIZE:512,S_BIG_BLOCK_MARK:9,L_BIG_BLOCK_SIZE:4096,L_BIG_BLOCK_MARK:12,SMALL_BLOCK_SIZE:64,BIG_BLOCK_MIN_DOC_SIZE:4096,HEADER:{PROPERTY_START_OFFSET:48,BAT_START_OFFSET:76,BAT_COUNT_OFFSET:44,SBAT_START_OFFSET:60,SBAT_COUNT_OFFSET:64,XBAT_START_OFFSET:68,XBAT_COUNT_OFFSET:72},PROP:{NO_INDEX:-1,PROPERTY_SIZE:128,NAME_SIZE_OFFSET:64,MAX_NAME_LENGTH:64/2-1,TYPE_OFFSET:66,PREVIOUS_PROPERTY_OFFSET:68,NEXT_PROPERTY_OFFSET:72,CHILD_PROPERTY_OFFSET:76,START_BLOCK_OFFSET:116,SIZE_OFFSET:120,TYPE_ENUM:{UNALLOCATED:0,DIRECTORY:1,DOCUMENT:2,ROOT:5}},FIELD:{PREFIX:{ATTACHMENT:"__attach_version1.0",RECIPIENT:"__recip_version1.0",DOCUMENT:"__substg1.",NAMEID:"__nameid_version1.0"},NAME_MAPPING:{"001a":"messageClass","0037":"subject","0c1a":"senderName","0c1e":"senderAddressType","0c1f":"senderEmail","5d01":"senderSmtpAddress","5d02":"sentRepresentingSmtpAddress","5d0a":"creatorSMTPAddress","5d0b":"lastModifierSMTPAddress",1e3:"body","007d":"headers",1009:"compressedRtf","3ffa":"lastModifierName","0039":"clientSubmitTime","0e06":"messageDeliveryTime","3fde":"internetCodepage","3ffd":"messageCodepage","3ff1":"messageLocaleId","0e07":"messageFlags",1035:"messageId","3fd9":"preview",3007:"creationTime",3008:"lastModificationTime",3703:"extension",3704:"fileNameShort",3707:"fileName",3712:"pidContentId","7ffe":"attachmentHidden","370e":"attachMimeTag","0c15":"recipType",3001:"name",3002:"addressType",3003:"email","39fe":"smtpAddress","3a18":"departmentName","3a44":"middleName","3a05":"generation","3a11":"surname","3a27":"addressCity","3a16":"companyName","3a24":"businessFaxNumber","3a29":"streetAddress","3a51":"businessHomePage","3a06":"givenName","3a09":"homeTelephoneNumber","3a15":"postalAddress","3a17":"title","3a1c":"mobileTelephoneNumber","3a26":"country","3a28":"stateOrProvince","3a2a":"postalCode","3a45":"displayNamePrefix","0070":"conversationTopic","0e1d":"normalizedSubject","3a08":"businessTelephoneNumber","3a0d":"location"},FULL_NAME_MAPPING:{"1013001f":"bodyHtml",10130102:"html"},PIDLID_MAPPING:{"00062008-0000-0000-c000-000000000046":{34080:{id:"PidLidVerbStream"},34084:{id:"PidLidVerbResponse",dispid:"votingResponse"},34176:{id:"PidLidInternetAccountName",dispid:"inetAcctName"}},"00062002-0000-0000-c000-000000000046":{33293:{id:"PidLidAppointmentStartWhole",dispid:"apptStartWhole"},33294:{id:"PidLidAppointmentEndWhole",dispid:"apptEndWhole"},33333:{id:"PidLidClipStart",dispid:"clipStart"},33334:{id:"PidLidClipEnd",dispid:"clipEnd"},33331:{id:"PidLidTimeZoneStruct",dispid:"timeZoneStruct"},33332:{id:"PidLidTimeZoneDescription",dispid:"timeZoneDesc"},33374:{id:"PidLidAppointmentTimeZoneDefinitionStartDisplay",dispid:"apptTZDefStartDisplay"},33375:{id:"PidLidAppointmentTimeZoneDefinitionEndDisplay",dispid:"apptTZDefEndDisplay"},33376:{id:"PidLidAppointmentTimeZoneDefinitionRecur",dispid:"apptTZDefRecur"},33302:{id:"PidLidAppointmentRecur",dispid:"apptRecur"},33288:{id:"PidLidLocation",dispid:"apptLocation"}},"00062004-0000-0000-c000-000000000046":{32812:{id:"dispidYomiFirstName",dispid:"yomiFirstName"},32899:{id:"dispidEmail1EmailAddress",dispid:"email1EmailAddress"},32814:{id:"dispidYomiCompanyName",dispid:"yomiCompanyName"},32978:{id:"PidLidFax3AddressType",dispid:"fax3AddrType"},32896:{id:"PidLidEmail1DisplayName",dispid:"email1DisplayName"},32900:{id:"PidLidEmail1OriginalDisplayName",dispid:"email1OriginalDisplayName"},32773:{id:"PidLidFileUnder",dispid:"fileUnder"},32813:{id:"PidLidYomiLastName",dispid:"yomiLastName"},32946:{id:"PidLidFax1AddressType",dispid:"fax1AddrType"},32963:{id:"PidLidFax2EmailAddress",dispid:"fax2EmailAddress"},32838:{id:"PidLidWorkAddressCity",dispid:"workAddressCity"},32989:{id:"PidLidAddressCountryCode",dispid:"addressCountryCode"},32962:{id:"PidLidFax2AddressType",dispid:"fax2AddrType"},32964:{id:"PidLidFax2OriginalDisplayName",dispid:"fax2OriginalDisplayName"},32840:{id:"PidLidWorkAddressPostalCode",dispid:"workAddressPostalCode"},32837:{id:"PidLidWorkAddressStreet",dispid:"workAddressStreet"},32839:{id:"PidLidWorkAddressState",dispid:"workAddressState"},32987:{id:"PidLidWorkAddressCountryCode",dispid:"workAddressCountryCode"},32841:{id:"PidLidWorkAddressCountry",dispid:"workAddressCountry"},32811:{id:"PidLidHtml",dispid:"contactHtml"},32795:{id:"PidLidWorkAddress",dispid:"workAddress"},32948:{id:"PidLidFax1OriginalDisplayName",dispid:"fax1OriginalDisplayName"},32866:{id:"PidLidInstantMessagingAddress",dispid:"instMsg"},32784:{id:"PidLidDepartment",dispid:"department"},32947:{id:"PidLidFax1EmailAddress",dispid:"fax1EmailAddress"},32980:{id:"PidLidFax3OriginalDisplayName",dispid:"fax3OriginalDisplayName"},32979:{id:"PidLidFax3EmailAddress",dispid:"fax3EmailAddress"}},"6ed8da90-450b-101b-98da-00aa003f1305":{3:{id:"PidLidGlobalObjectId",dispid:"globalAppointmentID"},40:{id:"PidLidOldLocation",dispid:"apptOldLocation"}}},CLASS_MAPPING:{ATTACHMENT_DATA:"3701"},TYPE_MAPPING:{"001e":"string","001f":"unicode","0040":"time","0102":"binary","0003":"integer","000b":"boolean"},DIR_TYPE:{INNER_MSG:"000d"}}}}});var we={};ze(we,{decode:()=>_e,default:()=>kr,encodingExists:()=>Ie});function _e(r,t){try{return new TextDecoder(String(t||"utf-8").toLowerCase()).decode(r)}catch{return new TextDecoder("windows-1252").decode(r)}}function Ie(){return!0}var kr,me=zt(()=>{w();kr={decode:_e,encodingExists:Ie}});var Et=L(Pt=>{"use strict";w();Object.defineProperty(Pt,"__esModule",{value:!0});var Te=(me(),Ke(we)),Gr=(function(){function r(t,e,i){if(this._dynamicSize=!0,this._byteLength=0,this.failurePosition=0,this._byteOffset=e||0,t instanceof ArrayBuffer)this.buffer=t;else if(t instanceof DataView)this.dataView=t;else if(t&&t.buffer instanceof ArrayBuffer)this._byteOffset+=t.byteOffset,this._buffer=t.buffer,this._dataView=new DataView(this._buffer,this._byteOffset),this._byteLength=this._dataView.byteLength+this._byteOffset;else throw new Error("Unknown arrayBuffer");this.position=0,this.endianness=i??r.LITTLE_ENDIAN}return r.prototype.save=function(t){var e=new Blob([this.buffer]),i=window.webkitURL||window.URL;if(i&&i.createObjectURL){var n=i.createObjectURL(e),a=document.createElement("a");a.setAttribute("href",n),a.setAttribute("download",t),a.click(),i.revokeObjectURL(n)}else throw"DataStream.save: Can't create object URL."},Object.defineProperty(r.prototype,"dynamicSize",{get:function(){return this._dynamicSize},set:function(t){t||this._trimAlloc(),this._dynamicSize=t},enumerable:!1,configurable:!0}),Object.defineProperty(r.prototype,"byteLength",{get:function(){return this._byteLength-this._byteOffset},enumerable:!1,configurable:!0}),Object.defineProperty(r.prototype,"buffer",{get:function(){return this._trimAlloc(),this._buffer},set:function(t){this._buffer=t,this._dataView=new DataView(this._buffer,this._byteOffset),this._byteLength=this._buffer.byteLength},enumerable:!1,configurable:!0}),Object.defineProperty(r.prototype,"byteOffset",{get:function(){return this._byteOffset},set:function(t){this._byteOffset=t,this._dataView=new DataView(this._buffer,this._byteOffset),this._byteLength=this._buffer.byteLength},enumerable:!1,configurable:!0}),Object.defineProperty(r.prototype,"dataView",{get:function(){return this._dataView},set:function(t){this._byteOffset=t.byteOffset,this._buffer=t.buffer,this._dataView=new DataView(this._buffer,this._byteOffset),this._byteLength=this._byteOffset+t.byteLength},enumerable:!1,configurable:!0}),r.prototype._realloc=function(t){if(this._dynamicSize){var e=this._byteOffset+this.position+t,i=this._buffer.byteLength;if(e<=i){e>this._byteLength&&(this._byteLength=e);return}for(i<1&&(i=1);e>i;)i*=2;var n=new ArrayBuffer(i),a=new Uint8Array(this._buffer),o=new Uint8Array(n,0,a.length);o.set(a),this.buffer=n,this._byteLength=e}},r.prototype._trimAlloc=function(){if(this._byteLength!=this._buffer.byteLength){var t=new ArrayBuffer(this._byteLength),e=new Uint8Array(t),i=new Uint8Array(this._buffer,0,e.length);e.set(i),this.buffer=t}},r.prototype.seek=function(t){var e=Math.max(0,Math.min(this.byteLength,t));this.position=isNaN(e)||!isFinite(e)?0:e},r.prototype.isEof=function(){return this.position>=this.byteLength},r.prototype.mapInt32Array=function(t,e){this._realloc(t*4);var i=new Int32Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*4,i},r.prototype.mapInt16Array=function(t,e){this._realloc(t*2);var i=new Int16Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*2,i},r.prototype.mapInt8Array=function(t){this._realloc(t*1);var e=new Int8Array(this._buffer,this.byteOffset+this.position,t);return this.position+=t*1,e},r.prototype.mapUint32Array=function(t,e){this._realloc(t*4);var i=new Uint32Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*4,i},r.prototype.mapUint16Array=function(t,e){this._realloc(t*2);var i=new Uint16Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*2,i},r.prototype.mapUint8Array=function(t){this._realloc(t*1);var e=new Uint8Array(this._buffer,this.byteOffset+this.position,t);return this.position+=t*1,e},r.prototype.mapFloat64Array=function(t,e){this._realloc(t*8);var i=new Float64Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*8,i},r.prototype.mapFloat32Array=function(t,e){this._realloc(t*4);var i=new Float32Array(this._buffer,this.byteOffset+this.position,t);return r.arrayToNative(i,e??this.endianness),this.position+=t*4,i},r.prototype.readInt32Array=function(t,e){t=t??(this.byteLength-this.position)/4;var i=new Int32Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.readInt16Array=function(t,e){t=t??(this.byteLength-this.position)/2;var i=new Int16Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.readInt8Array=function(t){t=t??this.byteLength-this.position;var e=new Int8Array(t);return r.memcpy(e.buffer,0,this.buffer,this.byteOffset+this.position,t*e.BYTES_PER_ELEMENT),this.position+=e.byteLength,e},r.prototype.readUint32Array=function(t,e){t=t??(this.byteLength-this.position)/4;var i=new Uint32Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.readUint16Array=function(t,e){t=t??(this.byteLength-this.position)/2;var i=new Uint16Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.readUint8Array=function(t){t=t??this.byteLength-this.position;var e=new Uint8Array(t);return r.memcpy(e.buffer,0,this.buffer,this.byteOffset+this.position,t*e.BYTES_PER_ELEMENT),this.position+=e.byteLength,e},r.prototype.readToUint8Array=function(t,e,i){t=t??this.byteLength-this.position,r.memcpy(e.buffer,i,this.buffer,this.byteOffset+this.position,t*e.BYTES_PER_ELEMENT),this.position+=e.byteLength},r.prototype.readFloat64Array=function(t,e){t=t??(this.byteLength-this.position)/8;var i=new Float64Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.readFloat32Array=function(t,e){t=t??(this.byteLength-this.position)/4;var i=new Float32Array(t);return r.memcpy(i.buffer,0,this.buffer,this.byteOffset+this.position,t*i.BYTES_PER_ELEMENT),r.arrayToNative(i,e??this.endianness),this.position+=i.byteLength,i},r.prototype.writeInt32Array=function(t,e){if(this._realloc(t.length*4),t instanceof Int32Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapInt32Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeInt32(t[i],e)},r.prototype.writeInt16Array=function(t,e){if(this._realloc(t.length*2),t instanceof Int16Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapInt16Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeInt16(t[i],e)},r.prototype.writeInt8Array=function(t){if(this._realloc(t.length*1),t instanceof Int8Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapInt8Array(t.length);else for(var e=0;e<t.length;e++)this.writeInt8(t[e])},r.prototype.writeUint32Array=function(t,e){if(this._realloc(t.length*4),t instanceof Uint32Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapUint32Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeUint32(t[i],e)},r.prototype.writeUint16Array=function(t,e){if(this._realloc(t.length*2),t instanceof Uint16Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapUint16Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeUint16(t[i],e)},r.prototype.writeUint8Array=function(t){if(this._realloc(t.length*1),t instanceof Uint8Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapUint8Array(t.length);else for(var e=0;e<t.length;e++)this.writeUint8(t[e])},r.prototype.writeFloat64Array=function(t,e){if(this._realloc(t.length*8),t instanceof Float64Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapFloat64Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeFloat64(t[i],e)},r.prototype.writeFloat32Array=function(t,e){if(this._realloc(t.length*4),t instanceof Float32Array&&this.byteOffset+this.position%t.BYTES_PER_ELEMENT==0)r.memcpy(this._buffer,this.byteOffset+this.position,t.buffer,0,t.byteLength),this.mapFloat32Array(t.length,e);else for(var i=0;i<t.length;i++)this.writeFloat32(t[i],e)},r.prototype.readInt32=function(t){var e=this._dataView.getInt32(this.position,t??this.endianness);return this.position+=4,e},r.prototype.readInt=function(t){return this.seek(t),this.readInt32()},r.prototype.readInt16=function(t){var e=this._dataView.getInt16(this.position,t??this.endianness);return this.position+=2,e},r.prototype.readShort=function(t){return this.seek(t),this.readInt16()},r.prototype.readInt8=function(){var t=this._dataView.getInt8(this.position);return this.position+=1,t},r.prototype.readByte=function(t){return this.seek(t),this.readInt8()},r.prototype.readUint32=function(t){var e=this._dataView.getUint32(this.position,t??this.endianness);return this.position+=4,e},r.prototype.readUint16=function(t){var e=this._dataView.getUint16(this.position,t??this.endianness);return this.position+=2,e},r.prototype.readUint8=function(){var t=this._dataView.getUint8(this.position);return this.position+=1,t},r.prototype.readFloat32=function(t){var e=this._dataView.getFloat32(this.position,t??this.endianness);return this.position+=4,e},r.prototype.readFloat64=function(t){var e=this._dataView.getFloat64(this.position,t??this.endianness);return this.position+=8,e},r.prototype.writeInt32=function(t,e){this._realloc(4),this._dataView.setInt32(this.position,t,e??this.endianness),this.position+=4},r.prototype.writeInt16=function(t,e){this._realloc(2),this._dataView.setInt16(this.position,t,e??this.endianness),this.position+=2},r.prototype.writeInt8=function(t){this._realloc(1),this._dataView.setInt8(this.position,t),this.position+=1},r.prototype.writeUint32=function(t,e){this._realloc(4),this._dataView.setUint32(this.position,t,e??this.endianness),this.position+=4},r.prototype.writeUint16=function(t,e){this._realloc(2),this._dataView.setUint16(this.position,t,e??this.endianness),this.position+=2},r.prototype.writeUint8=function(t){this._realloc(1),this._dataView.setUint8(this.position,t),this.position+=1},r.prototype.writeFloat32=function(t,e){this._realloc(4),this._dataView.setFloat32(this.position,t,e??this.endianness),this.position+=4},r.prototype.writeFloat64=function(t,e){this._realloc(8),this._dataView.setFloat64(this.position,t,e??this.endianness),this.position+=8},r.memcpy=function(t,e,i,n,a){var o=new Uint8Array(t,e,a),s=new Uint8Array(i,n,a);o.set(s)},r.arrayToNative=function(t,e){return e==this.endianness?t:this.flipArrayEndianness(t)},r.nativeToEndian=function(t,e){return this.endianness==e?t:this.flipArrayEndianness(t)},r.flipArrayEndianness=function(t){for(var e=new Uint8Array(t.buffer,t.byteOffset,t.byteLength),i=0;i<t.byteLength;i+=t.BYTES_PER_ELEMENT)for(var n=i+t.BYTES_PER_ELEMENT-1,a=i;n>a;n--,a++){var o=e[a];e[a]=e[n],e[n]=o}return t},r.createStringFromArray=function(t){for(var e="",i=0;i<t.length;i++)e+=String.fromCharCode(t[i]);return e},r.prototype.readStruct=function(t){for(var e={},i,n,a,o=this.position,s=0;s<t.length;s+=2){if(i=t[s+1],n=this.readType(i,e),n==null)return this.failurePosition==0&&(this.failurePosition=this.position),this.position=o,null;e[t[s]]=n}return e},r.prototype.readUCS2String=function(t,e){return r.createStringFromArray(this.readUint16Array(t,e))},r.prototype.readStringAt=function(t,e){return this.seek(t),this.readUCS2String(e)},r.prototype.writeUCS2String=function(t,e,i){i==null&&(i=t.length);for(var n=0;n<t.length&&n<i;n++)this.writeUint16(t.charCodeAt(n),e);for(;n<i;n++)this.writeUint16(0,e)},r.prototype.readString=function(t,e){return e==null||e=="ASCII"?r.createStringFromArray(this.mapUint8Array(t??this.byteLength-this.position)):Te.decode(this.mapUint8Array(t),e)},r.prototype.writeString=function(t,e,i){if(e==null||e=="ASCII")if(i!=null){var n=0,a=Math.min(t.length,i);for(n=0;n<a;n++)this.writeUint8(t.charCodeAt(n));for(;n<i;n++)this.writeUint8(0)}else for(var n=0;n<t.length;n++)this.writeUint8(t.charCodeAt(n));else this.writeUint8Array(Te.encode(t.substring(0,i),e))},r.prototype.readCString=function(t){var e=this.byteLength-this.position,i=new Uint8Array(this._buffer,this._byteOffset+this.position),n=e;t!=null&&(n=Math.min(t,e));for(var a=0;a<n&&i[a]!=0;a++);var o=r.createStringFromArray(this.mapUint8Array(a));return t!=null?this.position+=n-a:a!=e&&(this.position+=1),o},r.prototype.writeCString=function(t,e){if(e!=null){var i=0,n=Math.min(t.length,e);for(i=0;i<n;i++)this.writeUint8(t.charCodeAt(i));for(;i<e;i++)this.writeUint8(0)}else{for(var i=0;i<t.length;i++)this.writeUint8(t.charCodeAt(i));this.writeUint8(0)}},r.prototype.readType=function(t,e){if(typeof t=="function")return t(this,e);if(typeof t=="object"&&!(t instanceof Array))return t.get(this,e);if(t instanceof Array&&t.length!=3)return this.readStruct(t);var i=null,n=null,a="ASCII",o=this.position,s;if(typeof t=="string"&&/:/.test(t)){var f=t.split(":");t=f[0],s=f[1],e[s]!=null?n=parseInt(e[s]):n=parseInt(f[1])}if(typeof t=="string"&&/,/.test(t)){var f=t.split(",");t=f[0],a=parseInt(f[1]).toString()}switch(t){case"uint8":i=this.readUint8();break;case"int8":i=this.readInt8();break;case"uint16":i=this.readUint16(this.endianness);break;case"int16":i=this.readInt16(this.endianness);break;case"uint32":i=this.readUint32(this.endianness);break;case"int32":i=this.readInt32(this.endianness);break;case"float32":i=this.readFloat32(this.endianness);break;case"float64":i=this.readFloat64(this.endianness);break;case"uint16be":i=this.readUint16(r.BIG_ENDIAN);break;case"int16be":i=this.readInt16(r.BIG_ENDIAN);break;case"uint32be":i=this.readUint32(r.BIG_ENDIAN);break;case"int32be":i=this.readInt32(r.BIG_ENDIAN);break;case"float32be":i=this.readFloat32(r.BIG_ENDIAN);break;case"float64be":i=this.readFloat64(r.BIG_ENDIAN);break;case"uint16le":i=this.readUint16(r.LITTLE_ENDIAN);break;case"int16le":i=this.readInt16(r.LITTLE_ENDIAN);break;case"uint32le":i=this.readUint32(r.LITTLE_ENDIAN);break;case"int32le":i=this.readInt32(r.LITTLE_ENDIAN);break;case"float32le":i=this.readFloat32(r.LITTLE_ENDIAN);break;case"float64le":i=this.readFloat64(r.LITTLE_ENDIAN);break;case"cstring":i=this.readCString(n);break;case"string":i=this.readString(n,a);break;case"u16string":i=this.readUCS2String(n,this.endianness);break;case"u16stringle":i=this.readUCS2String(n,r.LITTLE_ENDIAN);break;case"u16stringbe":i=this.readUCS2String(n,r.BIG_ENDIAN);break;default:if(t.length==3){var h=t[1],s=t[2],p=0;if(typeof s=="function"?p=s(e,this,t):typeof s=="string"&&e[s]!=null?p=parseInt(e[s]):p=parseInt(s),typeof h=="string"){var l=h.replace(/(le|be)$/,""),y=null;switch(/le$/.test(h)?y=r.LITTLE_ENDIAN:/be$/.test(h)&&(y=r.BIG_ENDIAN),s=="*"&&(p=null),l){case"uint8":i=this.readUint8Array(p);break;case"uint16":i=this.readUint16Array(p,y);break;case"uint32":i=this.readUint32Array(p,y);break;case"int8":i=this.readInt8Array(p);break;case"int16":i=this.readInt16Array(p,y);break;case"int32":i=this.readInt32Array(p,y);break;case"float32":i=this.readFloat32Array(p,y);break;case"float64":i=this.readFloat64Array(p,y);break;case"cstring":case"utf16string":case"string":if(p==null)for(i=[];!this.isEof();){var d=this.readType(h,e);if(d==null)break;i.push(d)}else{i=new Array(p);for(var A=0;A<p;A++)i[A]=this.readType(h,e)}break}}else if(s=="*")for(i=[],this.buffer;;){var T=this.position;try{var _=this.readType(h,e);if(_==null){this.position=T;break}i.push(_)}catch{this.position=T;break}}else{i=new Array(p);for(var A=0;A<p;A++){var d=this.readType(h,e);if(d==null)return null;i[A]=d}}break}}return n!=null&&(this.position=o+n),i},r.prototype.writeStruct=function(t,e){for(var i=0;i<t.length;i+=2){var n=t[i+1];this.writeType(n,e[t[i]],e)}},r.prototype.writeType=function(t,e,i){if(typeof t=="function")return t(this,e);if(typeof t=="object"&&!(t instanceof Array))return t.set(this,e,i);var n=null,a="ASCII",o=this.position;if(typeof t=="string"&&/:/.test(t)){var s=t.split(":");t=s[0],n=parseInt(s[1])}if(typeof t=="string"&&/,/.test(t)){var s=t.split(",");t=s[0],a=parseInt(s[1]).toString()}switch(t){case"uint8":this.writeUint8(e);break;case"int8":this.writeInt8(e);break;case"uint16":this.writeUint16(e,this.endianness);break;case"int16":this.writeInt16(e,this.endianness);break;case"uint32":this.writeUint32(e,this.endianness);break;case"int32":this.writeInt32(e,this.endianness);break;case"float32":this.writeFloat32(e,this.endianness);break;case"float64":this.writeFloat64(e,this.endianness);break;case"uint16be":this.writeUint16(e,r.BIG_ENDIAN);break;case"int16be":this.writeInt16(e,r.BIG_ENDIAN);break;case"uint32be":this.writeUint32(e,r.BIG_ENDIAN);break;case"int32be":this.writeInt32(e,r.BIG_ENDIAN);break;case"float32be":this.writeFloat32(e,r.BIG_ENDIAN);break;case"float64be":this.writeFloat64(e,r.BIG_ENDIAN);break;case"uint16le":this.writeUint16(e,r.LITTLE_ENDIAN);break;case"int16le":this.writeInt16(e,r.LITTLE_ENDIAN);break;case"uint32le":this.writeUint32(e,r.LITTLE_ENDIAN);break;case"int32le":this.writeInt32(e,r.LITTLE_ENDIAN);break;case"float32le":this.writeFloat32(e,r.LITTLE_ENDIAN);break;case"float64le":this.writeFloat64(e,r.LITTLE_ENDIAN);break;case"cstring":this.writeCString(e,n);break;case"string":this.writeString(e,a,n);break;case"u16string":this.writeUCS2String(e,this.endianness,n);break;case"u16stringle":this.writeUCS2String(e,r.LITTLE_ENDIAN,n);break;case"u16stringbe":this.writeUCS2String(e,r.BIG_ENDIAN,n);break;default:if(t.length==3){for(var f=t[1],h=0;h<e.length;h++)this.writeType(f,e[h],t[2]);break}else{this.writeStruct(t,e);break}}n!=null&&(this.position=o,this._realloc(n),this.position=o+n)},r.BIG_ENDIAN=!1,r.LITTLE_ENDIAN=!0,r.endianness=new Int8Array(new Int16Array([1]).buffer)[0]>0,r})();Pt.default=Gr;Uint8Array.prototype.BYTES_PER_ELEMENT===void 0&&(Object.defineProperties(Uint8Array.prototype,{BYTES_PER_ELEMENT:{value:Uint8Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Int8Array.prototype,{BYTES_PER_ELEMENT:{value:Int8Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Uint8ClampedArray.prototype,{BYTES_PER_ELEMENT:{value:Uint8ClampedArray.BYTES_PER_ELEMENT}}),Object.defineProperties(Uint16Array.prototype,{BYTES_PER_ELEMENT:{value:Uint16Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Int16Array.prototype,{BYTES_PER_ELEMENT:{value:Int16Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Uint32Array.prototype,{BYTES_PER_ELEMENT:{value:Uint32Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Int32Array.prototype,{BYTES_PER_ELEMENT:{value:Int32Array.BYTES_PER_ELEMENT}}),Object.defineProperties(Float64Array.prototype,{BYTES_PER_ELEMENT:{value:Float64Array.BYTES_PER_ELEMENT}}))});var Ct=L(K=>{"use strict";w();var ve=K&&K.__importDefault||function(r){return r&&r.__esModule?r:{default:r}};Object.defineProperty(K,"__esModule",{value:!0});K.Reader=K.TypeEnum=void 0;var be=ve(Et()),Yr=ut(),E=ve(vt()),ft;(function(r){r[r.DIRECTORY=1]="DIRECTORY",r[r.DOCUMENT=2]="DOCUMENT",r[r.ROOT=5]="ROOT"})(ft||(K.TypeEnum=ft={}));var Hr=(function(){function r(t){this.ds=new be.default(t,0,be.default.LITTLE_ENDIAN)}return r.prototype.isMSGFile=function(){return this.ds.seek(0),(0,Yr.arraysEqual)(E.default.FILE_HEADER,this.ds.readInt8Array(E.default.FILE_HEADER.length))},r.prototype.headerData=function(){this.bigBlockSize=this.ds.readByte(30)==E.default.MSG.L_BIG_BLOCK_MARK?E.default.MSG.L_BIG_BLOCK_SIZE:E.default.MSG.S_BIG_BLOCK_SIZE,this.bigBlockLength=this.bigBlockSize/4,this.xBlockLength=this.bigBlockLength-1,this.batCount=this.ds.readInt(E.default.MSG.HEADER.BAT_COUNT_OFFSET),this.propertyStart=this.ds.readInt(E.default.MSG.HEADER.PROPERTY_START_OFFSET),this.sbatStart=this.ds.readInt(E.default.MSG.HEADER.SBAT_START_OFFSET),this.sbatCount=this.ds.readInt(E.default.MSG.HEADER.SBAT_COUNT_OFFSET),this.xbatStart=this.ds.readInt(E.default.MSG.HEADER.XBAT_START_OFFSET),this.xbatCount=this.ds.readInt(E.default.MSG.HEADER.XBAT_COUNT_OFFSET)},r.prototype.convertName=function(t){var e=this.ds.readShort(t+E.default.MSG.PROP.NAME_SIZE_OFFSET);return e<1?"":this.ds.readStringAt(t,e/2).split("\0")[0]},r.prototype.convertProperty=function(t){return{type:this.ds.readByte(t+E.default.MSG.PROP.TYPE_OFFSET),name:this.convertName(t),previousProperty:this.ds.readInt(t+E.default.MSG.PROP.PREVIOUS_PROPERTY_OFFSET),nextProperty:this.ds.readInt(t+E.default.MSG.PROP.NEXT_PROPERTY_OFFSET),childProperty:this.ds.readInt(t+E.default.MSG.PROP.CHILD_PROPERTY_OFFSET),startBlock:this.ds.readInt(t+E.default.MSG.PROP.START_BLOCK_OFFSET),sizeBlock:this.ds.readInt(t+E.default.MSG.PROP.SIZE_OFFSET)}},r.prototype.convertBlockToProperties=function(t,e){for(var i=this.bigBlockSize/E.default.MSG.PROP.PROPERTY_SIZE,n=this.getBlockOffsetAt(t),a=0;a<i&&!(this.ds.byteLength<n+E.default.MSG.PROP.TYPE_OFFSET);a++){var o=this.ds.readByte(n+E.default.MSG.PROP.TYPE_OFFSET);switch(o){case E.default.MSG.PROP.TYPE_ENUM.ROOT:case E.default.MSG.PROP.TYPE_ENUM.DIRECTORY:case E.default.MSG.PROP.TYPE_ENUM.DOCUMENT:e.push(this.convertProperty(n));break;case E.default.MSG.PROP.TYPE_ENUM.UNALLOCATED:default:e.push({type:o,name:"",previousProperty:-1,nextProperty:-1,childProperty:-1,startBlock:0,sizeBlock:0});break}n+=E.default.MSG.PROP.PROPERTY_SIZE}},r.prototype.createPropertyHierarchy=function(t,e){if(!(!e||e.childProperty==E.default.MSG.PROP.NO_INDEX)){e.children=[];for(var i=[{currentMode:"walk",currentIndex:e.childProperty}];i.length!=0;){var n=i.pop(),a=n.currentMode,o=n.currentIndex,s=t[o];a==="push"?e.children.push(o):(s.type==E.default.MSG.PROP.TYPE_ENUM.DIRECTORY&&this.createPropertyHierarchy(t,s),s.nextProperty!=E.default.MSG.PROP.NO_INDEX&&i.push({currentMode:"walk",currentIndex:s.nextProperty}),i.push({currentMode:"push",currentIndex:o}),s.previousProperty!=E.default.MSG.PROP.NO_INDEX&&i.push({currentMode:"walk",currentIndex:s.previousProperty}))}}},r.prototype.propertyDataReader=function(t){for(var e=[],i=t;i!=E.default.MSG.END_OF_CHAIN;)this.convertBlockToProperties(i,e),i=this.getNextBlock(i);return this.createPropertyHierarchy(e,e[0]),e},r.prototype.parse=function(){this.headerData(),this.batData=this.batDataReader(),this.xbatCount>0&&this.xbatDataReader(),this.sbatData=this.sbatDataReader(),this.propertyData=this.propertyDataReader(this.propertyStart),this.bigBlockTable=this.readBigBlockTable()},r.prototype.batCountInHeader=function(){var t=(E.default.MSG.S_BIG_BLOCK_SIZE-E.default.MSG.HEADER.BAT_START_OFFSET)/4;return Math.min(this.batCount,t)},r.prototype.batDataReader=function(){var t=new Array(this.batCountInHeader());this.ds.seek(E.default.MSG.HEADER.BAT_START_OFFSET);for(var e=0;e<t.length;e++)t[e]=this.ds.readInt32();return t},r.prototype.getBlockOffsetAt=function(t){return(t+1)*this.bigBlockSize},r.prototype.getBlockAt=function(t){var e=this.getBlockOffsetAt(t);return this.ds.seek(e),this.ds.readInt32Array(this.bigBlockLength)},r.prototype.getBlockValueAt=function(t,e){var i=this.getBlockOffsetAt(t);return this.ds.seek(i+4*e),this.ds.readInt32()},r.prototype.getNextBlockInner=function(t,e){var i=Math.floor(t/this.bigBlockLength),n=t%this.bigBlockLength,a=e[i];return typeof a>"u"?E.default.MSG.END_OF_CHAIN:this.getBlockValueAt(a,n)},r.prototype.getNextBlock=function(t){return this.getNextBlockInner(t,this.batData)},r.prototype.sbatDataReader=function(){for(var t=[],e=this.sbatStart,i=0;i<this.sbatCount&&e&&e!=E.default.MSG.END_OF_CHAIN;i++)t.push(e),e=this.getNextBlock(e);return t},r.prototype.xbatDataReader=function(){for(var t=this.batCountInHeader(),e=this.batCount,i=e-t,n=this.xbatStart,a=0;a<this.xbatCount;a++){for(var o=this.getBlockAt(n),s=Math.min(i,this.xBlockLength),f=0;f<s;f++){var h=o[f];if(h==E.default.MSG.UNUSED_BLOCK||h==E.default.MSG.END_OF_CHAIN)break;this.batData.push(h)}if(i-=s,n=o[this.xBlockLength],n==E.default.MSG.UNUSED_BLOCK||n==E.default.MSG.END_OF_CHAIN)break}},r.prototype.getNextBlockSmall=function(t){return this.getNextBlockInner(t,this.sbatData)},r.prototype.getChainByBlockSmall=function(t){for(var e=[],i=t.startBlock;i!=E.default.MSG.END_OF_CHAIN;)e.push(i),i=this.getNextBlockSmall(i);return e},r.prototype.readBigBlockTable=function(){for(var t=this.propertyData[0],e=[],i=t.startBlock,n=0;i!=E.default.MSG.END_OF_CHAIN;n++)e.push(i),i=this.getNextBlock(i);return e},r.prototype.readDataByBlockSmall=function(t,e,i,n){var a=t*E.default.MSG.SMALL_BLOCK_SIZE,o=Math.floor(a/this.bigBlockSize),s=a%this.bigBlockSize,f=this.bigBlockTable[o],h=this.getBlockOffsetAt(f);return this.ds.seek(h+s),this.ds.readToUint8Array(e,i,n)},r.prototype.readChainDataByBlockSmall=function(t,e){for(var i=new Uint8Array(t.sizeBlock),n=0,a=0;n<e.length;n++){var o=i.length<a+E.default.MSG.SMALL_BLOCK_SIZE?i.length-a:E.default.MSG.SMALL_BLOCK_SIZE;this.readDataByBlockSmall(e[n],o,i,a),a+=o}return i},r.prototype.readProperty=function(t){if(t.sizeBlock)if(t.sizeBlock<E.default.MSG.BIG_BLOCK_MIN_DOC_SIZE){var e=this.getChainByBlockSmall(t);if(e.length==1){var i=new Uint8Array(t.sizeBlock);return this.readDataByBlockSmall(t.startBlock,t.sizeBlock,i,0),i}else if(e.length>1)return this.readChainDataByBlockSmall(t,e);return new Uint8Array(0)}else{for(var n=t.startBlock,a=t.sizeBlock,o=0,i=new Uint8Array(t.sizeBlock);1<=a;){var s=this.getBlockOffsetAt(n);this.ds.seek(s);var f=Math.min(a,this.bigBlockSize),h=this.ds.readUint8Array(f);i.set(h,o),o+=f,a-=f,n=this.getNextBlock(n)}return i}else return new Uint8Array(0)},r.prototype.readFileOf=function(t){return this.readProperty(this.propertyData[t])},r.prototype.folderOf=function(t){var e=this,i=this.propertyData;if(!i)return null;var n=i[t];return{dataId:t,name:n.name,fileNames:function(){var a=n.children;return a?a.map(function(o){return i[o]}).filter(function(o){return o.type===ft.DOCUMENT}).map(function(o){return o.name}):[]},fileNameSets:function(){var a=n.children;return a?a.map(function(o){return{subIndex:o,entry:i[o]}}).filter(function(o){return o.entry.type===ft.DOCUMENT}).map(function(o){return{name:o.entry.name,length:o.entry.sizeBlock,dataId:o.subIndex,provider:function(){return e.readProperty(o.entry)}}}):[]},subFolders:function(){var a=n.children;return a?a.filter(function(o){return i[o].type==ft.DIRECTORY}).map(function(o){return e.folderOf(o)}):[]},readFile:function(a){var o=n.children;if(o)for(var s=0,f=o;s<f.length;s++){var h=f[s],p=i[h];if(p&&p.type===ft.DOCUMENT&&p.name===a)return e.readProperty(p)}return null}}},r.prototype.rootFolder=function(){return this.folderOf(0)},r})();K.Reader=Hr});var Ne=L(At=>{"use strict";w();var Se=At&&At.__importDefault||function(r){return r&&r.__esModule?r:{default:r}};Object.defineProperty(At,"__esModule",{value:!0});At.burn=Wr;var tt=Ct(),ge=Se(Et()),jr=Se(vt());function ht(r){return r+511&-512}function Vr(r){return r+63&-64}var Ue=(function(){function r(t){this.sectors=t}return r.prototype.allocate=function(t){for(var e=this.sectors.length,i=0;i<t;i++){var n=i+1===t?-2:e+i+1;this.sectors.push(n)}return e},r.prototype.allocateAs=function(t,e){for(var i=this.sectors.length,n=0;n<t;n++)this.sectors.push(e);return i},r.prototype.finalize=function(t,e){for(var i=(t-this.sectors.length%t)%t;i>=1;i-=1)this.sectors.push(e);return this},r.prototype.count=function(){return this.sectors.length},r})(),Zr=(function(){function r(t){this.fat=new Ue([]),this.miniFat=new Ue([]),this.liteEnts=t.map(function(B){return{entry:B,left:-1,right:-1,child:-1,firstSector:0,isMini:B.length<4096,isRed:!1}}),this.buildTree(0);for(var e=this.fat.allocate(ht(128*this.liteEnts.length)/512),i=0,n=this.liteEnts.filter(function(B){return B.entry.type==tt.TypeEnum.DOCUMENT&&B.isMini===!1});i<n.length;i++){var a=n[i];a.firstSector=a.entry.length===0?-2:this.fat.allocate(ht(a.entry.length)/512)}for(var o=0,s=this.liteEnts.filter(function(B){return B.entry.type==tt.TypeEnum.DOCUMENT&&B.isMini===!0});o<s.length;o++){var a=s[o];a.firstSector=a.entry.length===0?-2:this.miniFat.allocate(Vr(a.entry.length)/64)}var f=ht(4*this.miniFat.count())/512,h=f!==0?this.fat.allocate(f):-2,p=64*this.miniFat.count(),l=this.fat.allocate(ht(p)/512);this.liteEnts[0].firstSector=l;var y=this.fat.allocateAs(ht(4*(this.fat.count()+this.fat.count()/128+this.fat.count()/13952))/512,-3),d=this.fat.count()-y,A=d>109?ht(4*Math.floor((d-109)/127*128))/512:0,T=A!==0?this.fat.allocateAs(A,-4):-2,_=new ArrayBuffer(512*(1+this.fat.count())),c=new ge.default(_,0,ge.default.LITTLE_ENDIAN);c.dynamicSize=!1,this.miniFat.finalize(512/4,-1);var I=[],b=[];{for(var m=0;m<109&&m<d;m++)I.push(y+m);for(var P=T+1;m<d;m++){b.push(y+m);var N=b.length&127;N===127&&(b.push(P),P++)}for(;;){var N=b.length&127;if(N===0)break;b.push(N===127?-2:-1)}}{c.seek(0),c.writeUint8Array(jr.default.FILE_HEADER),c.seek(24),c.writeUint16(62),c.writeUint16(3),c.writeUint16(65534),c.writeUint16(9),c.writeUint16(6),c.seek(44),c.writeInt32(d),c.writeInt32(e),c.seek(56),c.writeInt32(4096),c.writeInt32(h),c.writeInt32(f),c.writeInt32(T),c.writeInt32(A);for(var m=0;m<I.length;m++)c.writeInt32(I[m]);for(;m<109;m++)c.writeInt32(-1)}for(var m=0;m<this.liteEnts.length;m++){var a=this.liteEnts[m],U=512*(1+e)+128*m;c.seek(U),c.writeUCS2String(a.entry.name,null,null);var X=c.position-U;c.seek(U+64),c.writeUint16(Math.min(64,X+2)),c.writeUint8(a.entry.type),c.writeUint8(a.isRed?0:1),c.writeInt32(a.left),c.writeInt32(a.right),c.writeInt32(a.child),m===0&&(c.seek(U+80),c.writeUint8Array([11,13,2,0,0,0,0,0,192,0,0,0,0,0,0,70]));var q=m===0?p:a.entry.length,ct=q!==0?a.firstSector:a.entry.type===tt.TypeEnum.DIRECTORY?0:-2;c.seek(U+116),c.writeInt32(ct),c.writeInt32(q)}for(var et=0,V=this.liteEnts.filter(function(B){return B.entry.type==tt.TypeEnum.DOCUMENT&&B.isMini===!1});et<V.length;et++){var a=V[et],dt=a.entry.binaryProvider();c.seek(512*(1+a.firstSector)),c.writeUint8Array(dt)}for(var rt=0,gt=this.liteEnts.filter(function(B){return B.entry.type==tt.TypeEnum.DOCUMENT&&B.isMini===!0});rt<gt.length;rt++){var a=gt[rt],dt=a.entry.binaryProvider();c.seek(512*(1+l)+64*a.firstSector),c.writeUint8Array(dt)}c.seek(512*(1+h)),c.writeInt32Array(this.miniFat.sectors),this.fat.finalize(512/4,-1),c.seek(512*(1+y)),c.writeInt32Array(this.fat.sectors),A>=1&&(c.seek(512*(1+T)),c.writeInt32Array(b)),this.array=_}return r.prototype.compareName=function(t,e){var i=t.length-e.length;if(i===0){var n=t.toUpperCase(),a=e.toUpperCase();n>a?i=1:n<a&&(i=-1)}return i},r.prototype.buildTree=function(t){var e=this,i=this.liteEnts,n=i[t];if(n.entry.type===tt.TypeEnum.DOCUMENT)throw new Error("It must be a storage!");var a=n.entry.children.concat();if(1<=a.length){a.sort(function(l,y){return e.compareName(i[l].entry.name,i[y].entry.name)});var o=function(l,y,d){if(l<y){var A=Math.floor((l+y)/2),T=a[A],_=i[T];return _.isRed=d,_.left=o(l,A,!d),_.right=o(A+1,y,!d),T}else return-1},s=function(){var l=Math.floor(a.length/2),y=a[l],d=i[y];return d.isRed=!1,d.left=o(0,l,!0),d.right=o(l+1,a.length,!0),y};n.child=s();for(var f=0,h=a.filter(function(l){return i[l].entry.type===tt.TypeEnum.DIRECTORY});f<h.length;f++){var p=h[f];this.buildTree(p)}}},r})();function Wr(r){return new Uint8Array(new Zr(r).array)}});var Le=L(_t=>{"use strict";w();var qr=_t&&_t.__importDefault||function(r){return r&&r.__esModule?r:{default:r}};Object.defineProperty(_t,"__esModule",{value:!0});_t.parse=zr;var Be=qr(Et());function zr(r){for(var t=new Be.default(r,0,Be.default.LITTLE_ENDIAN),e=[];!t.isEof();){var i=t.readUint32(),n=t.readUint16(),a=t.readUint16();e.push({key:i,isStringProperty:(n&1)!=0,guidIndex:n>>1&32767,propertyIndex:a})}return e}});var xe=L(kt=>{"use strict";w();Object.defineProperty(kt,"__esModule",{value:!0});kt.parse=Kr;function Kr(r){for(var t=[],e=0;!r.isEof();){var i=r.readUint16();if(i===258){e=r.readUint16();for(var n=r.readUint16(),a=0;a<e;a+=1){var o=r.readInt32(),s=r.readUint8(),f=r.readString(s),h=r.readUint8(),p=r.readString(h),l=r.readUint8(),y=r.readString(l),d=r.readUint8(),A=r.readString(d),T=r.readInt32(),_=r.readUint8(),c=r.readInt32(),I=r.readInt32(),b=r.readInt32(),m=r.readInt32(),P=r.readInt32(),N=r.readInt32();t.push({VerbType:o,DisplayName:f})}}else if(i===260)for(var a=0;a<e;a+=1){var s=r.readUint8(),f=r.readUCS2String(s),d=r.readUint8(),A=r.readUCS2String(d);t[a].DisplayName=f}}return t.filter(function(U){return U.VerbType===4}).map(function(U){return U.DisplayName}).join(";")}});var Re=L(Yt=>{"use strict";w();Object.defineProperty(Yt,"__esModule",{value:!0});Yt.parse=Jr;var Gt=ut(),$r=1,Xr=2;function Jr(r){var t={rules:[]};if(!r.isEof()){var e=r.readUint8();if(e!==2)throw new Error("TZDEFINITION major version not supported");var i=r.readUint8();if(e<1)throw new Error("TZDEFINITION minor version not supported");var n=r.readUint16(),a=r.readUint16();if(a&$r&&(r.readInt32(),r.readInt32(),r.readInt32(),r.readInt32()),a&Xr){var o=r.readUint16();t.keyName=r.readUCS2String(o)}var s=r.readUint16();r.seek(4+n);for(var f=0;f<s;f++){var h=r.readUint8();if(h!==2)break;var p=r.readUint8();if(h<1)break;var l=r.readUint16(),y=r.position,d=r.readUint16(),A=(0,Gt.readSystemTime)(r),T=r.readInt32(),_=r.readInt32(),c=r.readInt32(),I=(0,Gt.readTransitionSystemTime)(r),b=(0,Gt.readTransitionSystemTime)(r),m=Object.assign({},{flags:d,start:A?.toUTCString()||null,bias:T,standardBias:_,daylightBias:c,standardDate:I,daylightDate:b});t.rules.push(m),r.seek(y+l)}}return t}});var De=L(Ht=>{"use strict";w();Object.defineProperty(Ht,"__esModule",{value:!0});Ht.parse=Qr;var Oe=ut();function Qr(r){if(!r.isEof()){var t=r.readInt32(),e=r.readInt32(),i=r.readInt32(),n=r.readUint16(),a=(0,Oe.readTransitionSystemTime)(r),o=r.readUint16(),s=(0,Oe.readTransitionSystemTime)(r);return Object.assign({},{bias:t,standardBias:e,daylightBias:i,standardYear:n,standardDate:a,daylightYear:o,daylightDate:s})}return null}});var jt=L(M=>{"use strict";w();Object.defineProperty(M,"__esModule",{value:!0});M.OverrideFlags=M.EndType=M.CalendarType=M.PatternType=M.RecurFrequency=void 0;M.parse=ei;var Fe;(function(r){r[r.Daily=8202]="Daily",r[r.Weekly=8203]="Weekly",r[r.Monthly=8204]="Monthly",r[r.Yearly=8205]="Yearly"})(Fe||(M.RecurFrequency=Fe={}));var W;(function(r){r[r.Day=0]="Day",r[r.Week=1]="Week",r[r.Month=2]="Month",r[r.MonthEnd=4]="MonthEnd",r[r.MonthNth=3]="MonthNth",r[r.HjMonth=10]="HjMonth",r[r.HjMonthNth=11]="HjMonthNth",r[r.HjMonthEnd=12]="HjMonthEnd"})(W||(M.PatternType=W={}));var Me;(function(r){r[r.Default=0]="Default",r[r.CAL_GREGORIAN=1]="CAL_GREGORIAN",r[r.CAL_GREGORIAN_US=2]="CAL_GREGORIAN_US",r[r.CAL_JAPAN=3]="CAL_JAPAN",r[r.CAL_TAIWAN=4]="CAL_TAIWAN",r[r.CAL_KOREA=5]="CAL_KOREA",r[r.CAL_HIJRI=6]="CAL_HIJRI",r[r.CAL_THAI=7]="CAL_THAI",r[r.CAL_HEBREW=8]="CAL_HEBREW",r[r.CAL_GREGORIAN_ME_FRENCH=9]="CAL_GREGORIAN_ME_FRENCH",r[r.CAL_GREGORIAN_ARABIC=10]="CAL_GREGORIAN_ARABIC",r[r.CAL_GREGORIAN_XLIT_ENGLISH=11]="CAL_GREGORIAN_XLIT_ENGLISH",r[r.CAL_GREGORIAN_XLIT_FRENCH=12]="CAL_GREGORIAN_XLIT_FRENCH",r[r.CAL_LUNAR_JAPANESE=14]="CAL_LUNAR_JAPANESE",r[r.CAL_CHINESE_LUNAR=15]="CAL_CHINESE_LUNAR",r[r.CAL_SAKA=16]="CAL_SAKA",r[r.CAL_LUNAR_ETO_CHN=17]="CAL_LUNAR_ETO_CHN",r[r.CAL_LUNAR_ETO_KOR=18]="CAL_LUNAR_ETO_KOR",r[r.CAL_LUNAR_ROKUYOU=19]="CAL_LUNAR_ROKUYOU",r[r.CAL_LUNAR_KOREAN=20]="CAL_LUNAR_KOREAN",r[r.CAL_UMALQURA=23]="CAL_UMALQURA"})(Me||(M.CalendarType=Me={}));var Pe;(function(r){r[r.EndAfterDate=8225]="EndAfterDate",r[r.EndAfterNOccurrences=8226]="EndAfterNOccurrences",r[r.NeverEnd=8227]="NeverEnd",r[r.NeverEnd2=4294967295]="NeverEnd2"})(Pe||(M.EndType=Pe={}));var x;(function(r){r[r.ARO_SUBJECT=1]="ARO_SUBJECT",r[r.ARO_MEETINGTYPE=2]="ARO_MEETINGTYPE",r[r.ARO_REMINDERDELTA=4]="ARO_REMINDERDELTA",r[r.ARO_REMINDER=8]="ARO_REMINDER",r[r.ARO_LOCATION=16]="ARO_LOCATION",r[r.ARO_BUSYSTATUS=32]="ARO_BUSYSTATUS",r[r.ARO_ATTACHMENT=64]="ARO_ATTACHMENT",r[r.ARO_SUBTYPE=128]="ARO_SUBTYPE",r[r.ARO_APPTCOLOR=256]="ARO_APPTCOLOR",r[r.ARO_EXCEPTIONAL_BODY=512]="ARO_EXCEPTIONAL_BODY"})(x||(M.OverrideFlags=x={}));function ti(r){var t=r.readUint16();if(t!==12292)throw new Error("ReaderVersion not supported");var e=r.readUint16();if(e!==12292)throw new Error("WriterVersion not supported");var i=r.readUint16(),n=r.readUint16(),a=r.readUint16(),o=r.readUint32(),s=r.readUint32(),f=r.readUint32(),h=void 0,p=void 0,l=void 0;n===W.Week?h={dayOfWeekBits:r.readUint32()}:n===W.Month||n===W.MonthEnd||n===W.HjMonth||n===W.HjMonthEnd?p={day:r.readUint32()}:(n===W.MonthNth||n===W.HjMonthNth)&&(l={dayOfWeekBits:r.readUint32(),n:r.readUint32()});var y=r.readUint32(),d=r.readUint32(),A=r.readUint32(),T=r.readUint32(),_=Array.from(r.readUint32Array(T)),c=r.readUint32(),I=Array.from(r.readUint32Array(c)),b=r.readUint32(),m=r.readUint32();return Object.assign({recurFrequency:i,patternType:n,calendarType:a,firstDateTime:o,period:s,slidingFlag:f,endType:y,occurrenceCount:d,firstDOW:A,deletedInstanceDates:_,modifiedInstanceDates:I,startDate:b,endDate:m},h?{patternTypeWeek:h}:{},p?{patternTypeMonth:p}:{},l?{patternTypeMonthNth:l}:{})}function ei(r,t){var e=ti(r),i=r.readUint32();if(i!==12294)throw new Error("ReaderVersion2 not supported");var n=r.readUint32();if(n<12294)throw new Error("WriterVersion2 not supported");for(var a=r.readUint32(),o=r.readUint32(),s=r.readUint16(),f=[],h=0;h<s;h++){var p=r.readUint32(),l=r.readUint32(),y=r.readUint32(),d=r.readUint16(),A=void 0;if(d&x.ARO_SUBJECT){var T=r.readUint16(),_=r.readUint16();if(T-1!==_)throw new Error("subjectLength ".concat(T," and subjectLength2 ").concat(_," are not close!"));A=r.readString(_,t)}var c=void 0;d&x.ARO_MEETINGTYPE&&(c=r.readUint32());var I=void 0;d&x.ARO_REMINDERDELTA&&(I=r.readUint32());var b=void 0;d&x.ARO_REMINDER&&(b=r.readUint32());var m=void 0;if(d&x.ARO_LOCATION){var P=r.readUint16(),N=r.readUint16();if(P-1!==N)throw new Error("locationLength ".concat(P," and locationLength2 ").concat(N," are not close!"));m=r.readString(N,t)}var U=void 0;d&x.ARO_BUSYSTATUS&&(U=r.readUint32());var X=void 0;d&x.ARO_ATTACHMENT&&(X=r.readUint32());var q=void 0;d&x.ARO_SUBTYPE&&(q=r.readUint32());var ct=void 0;d&x.ARO_APPTCOLOR&&(ct=r.readUint32()),f.push(Object.assign({startDateTime:p,endDateTime:l,originalStartTime:y,overrideFlags:d},A?{subject:A}:{},c?{meetingType:c}:{},I?{reminderDelta:I}:{},b?{reminderSet:b}:{},m?{location:m}:{},U?{busyStatus:U}:{},X?{attachment:X}:{},q?{subType:q}:{},ct?{appointmentColor:ct}:{}))}var et=r.readUint32();if(et!==0)throw new Error("reservedBlock1Size ".concat(et," is not zero, AppointmentRecur is broken"));for(var h=0;h<s;h++){var V=f[h];if(12297<=n){var dt=r.readUint32();V.changeHighlight=r.readUint32(),r.position+=dt-4}var rt=r.readUint32();if(rt!==0)throw new Error("reservedBlockEE1Size ".concat(rt," is not zero, AppointmentRecur is broken"));if(V.overrideFlags&(x.ARO_SUBJECT|x.ARO_LOCATION)){var p=r.readUint32(),l=r.readUint32(),gt=r.readUint32();if(V.overrideFlags&x.ARO_SUBJECT){var B=r.readUint16();V.subject=r.readUCS2String(B)}if(V.overrideFlags&x.ARO_LOCATION){var He=r.readUint16();V.location=r.readUCS2String(He)}var Wt=r.readUint32();if(Wt!==0)throw new Error("reservedBlockEE2Size ".concat(Wt," is not zero, AppointmentRecur is broken"))}}var qt=r.readUint32();if(qt!==0)throw new Error("reservedBlock2Size ".concat(qt," is not zero, AppointmentRecur is broken"));return{recurrencePattern:e,startTimeOffset:a,endTimeOffset:o,exceptionInfo:f}}});var Vt=L(R=>{"use strict";w();var Ge=R&&R.__importDefault||function(r){return r&&r.__esModule?r:{default:r}};Object.defineProperty(R,"__esModule",{value:!0});R.OverrideFlags=R.EndType=R.CalendarType=R.PatternType=R.RecurFrequency=void 0;var k=Ge(vt()),$=Ge(Et()),ri=Ct(),ii=Ne(),pt=ut(),ni=Le(),ai=xe(),oi=Re(),si=De(),ui=jt(),It=jt();Object.defineProperty(R,"RecurFrequency",{enumerable:!0,get:function(){return It.RecurFrequency}});Object.defineProperty(R,"PatternType",{enumerable:!0,get:function(){return It.PatternType}});Object.defineProperty(R,"CalendarType",{enumerable:!0,get:function(){return It.CalendarType}});Object.defineProperty(R,"EndType",{enumerable:!0,get:function(){return It.EndType}});Object.defineProperty(R,"OverrideFlags",{enumerable:!0,get:function(){return It.OverrideFlags}});var lt;(function(r){r[r.DIRECTORY=1]="DIRECTORY",r[r.DOCUMENT=2]="DOCUMENT",r[r.ROOT=5]="ROOT"})(lt||(lt={}));var H;(function(r){r[r.root=0]="root",r[r.toSub=1]="toSub",r[r.named=2]="named"})(H||(H={}));function Ce(r){return(r-116444736e9)/1e4}function ke(r){var t=r.indexOf("\0");return t!==-1?r.substring(0,t):r}var fi=(function(){function r(t){this.reader=new ri.Reader(t)}return r.prototype.decodeField=function(t,e,i,n,a){var o=i(),s=new $.default(o,0,$.default.LITTLE_ENDIAN),f=k.default.MSG.FIELD.FULL_NAME_MAPPING["".concat(t).concat(e)]||k.default.MSG.FIELD.NAME_MAPPING[t],h=H.root,p=void 0,l=void 0,y=parseInt("0x".concat(t));if(y>=32768){var d=this.privatePidToKeyed[y];if(d)if(d.useName)f=d.name,h=H.named;else{p=d.propertySet,l=(0,pt.toHex4)(d.propertyLid);var A=k.default.MSG.FIELD.PIDLID_MAPPING[d.propertySet];if(A!==void 0){var T=A[d.propertyLid];T!==void 0&&(T.dispid!==void 0?(f=T.dispid,h=H.root):(f=T.id,h=H.toSub))}}}var _=o,c=!1,I=k.default.MSG.FIELD.TYPE_MAPPING[e];if(I==="string")_=ke(s.readString(o.length,n)),c=a;else if(I==="unicode")_=ke(s.readUCS2String(o.length/2)),c=a;else if(I==="binary")c=a;else if(I==="integer")_=s.readUint32();else if(I==="boolean")_=!!s.readUint16();else if(I==="time"){var b=s.readUint32(),m=b+4294967296*s.readUint32();_=new Date(Ce(m)).toUTCString()}if(c&&(f=void 0),f==="PidLidVerbStream")f="votingOptions",h=H.root,_=(0,ai.parse)(s);else if(f==="apptTZDefStartDisplay"||f==="apptTZDefEndDisplay"||f==="apptTZDefRecur")h=H.root,_=(0,oi.parse)(s);else if(f==="timeZoneStruct")_=(0,si.parse)(s);else if(f==="apptRecur")try{_=(0,ui.parse)(s,n)}catch(q){console.debug(q),f=void 0}else if(f==="recipType"){var P=1,N=2,U=3;_===P?_="to":_===N?_="cc":_===U&&(_="bcc")}else f==="globalAppointmentID"&&(_=(0,pt.bin2HexUpper)(s));var X="".concat(t).concat(e);return{key:f,keyType:h,value:_,notForRawProp:c,propertyTag:X,propertySet:p,propertyLid:l}},r.prototype.fieldsDataDocument=function(t,e,i){var n=e.name.substring(12).toLowerCase(),a=n.substring(0,4),o=n.substring(4,8);t.propertyObserver&&t.propertyObserver(i,parseInt(n.substring(0,8),16),e.provider()),a==k.default.MSG.FIELD.CLASS_MAPPING.ATTACHMENT_DATA?(i.dataId=e.dataId,i.contentLength=e.length):this.setDecodedFieldTo(t,i,this.decodeField(a,o,e.provider,t.ansiEncoding,!1))},r.prototype.setDecodedFieldTo=function(t,e,i){var n=i.key,a=i.keyType,o=i.value;n!==void 0&&a===H.root&&(e[n]=o),t.includeRawProps===!0&&(e.rawProps=e.rawProps||[],i.notForRawProp||e.rawProps.push({propertyTag:i.propertyTag,propertySet:i.propertySet,propertyLid:i.propertyLid,propertyName:i.keyType===H.named?i.key:void 0,value:o}))},r.prototype.getFieldType=function(t){var e=t.name.substring(12).toLowerCase();return e.substring(4,8)},r.prototype.fieldsDataDirInner=function(t,e,i,n){var a=this;if(e.name.indexOf(k.default.MSG.FIELD.PREFIX.ATTACHMENT)==0){var o={dataType:"attachment"};n.attachments.push(o),this.fieldsDataDir(t,e,i,o,"attachment")}else if(e.name.indexOf(k.default.MSG.FIELD.PREFIX.RECIPIENT)==0){var s={dataType:"recipient"};n.recipients.push(s),this.fieldsDataDir(t,e,i,s,"recip")}else if(e.name.indexOf(k.default.MSG.FIELD.PREFIX.NAMEID)==0)this.fieldsNameIdDir(t,e,i,n);else{var f=this.getFieldType(e);if(f==k.default.MSG.FIELD.DIR_TYPE.INNER_MSG){var h={dataType:"msg",attachments:[],recipients:[]};this.fieldsDataDir(t,e,i,h,"sub"),n.innerMsgContentFields=h,n.innerMsgContent=!0,n.folderId=e.dataId,this.innerMsgBurners[e.dataId]=function(){return a.burnMsg(e,i)}}}},r.prototype.burnMsg=function(t,e){var i=[{name:"Root Entry",type:lt.ROOT,children:[],length:0}];return this.registerFolder(i,0,t,e,0),(0,ii.burn)(i)},r.prototype.registerFolder=function(t,e,i,n,a){for(var o=function(I){var b=I.provider,m=I.length;if(a===0&&I.name==="__properties_version1.0"){var P=b(),N=new Uint8Array(P.length+8);N.set(P.subarray(0,24),0),N.set(P.subarray(24),32),b=function(){return N},m=N.length}var U=t.length;t[e].children.push(U),t.push({name:I.name,type:lt.DOCUMENT,binaryProvider:b,length:m})},s=0,f=i.fileNameSets();s<f.length;s++){var h=f[s];o(h)}if(a===0)for(var p=n.subFolders().filter(function(I){return I.name===k.default.MSG.FIELD.PREFIX.NAMEID}),l=0,y=p;l<y.length;l++){var d=y[l],A=t.length;t[e].children.push(A),t.push({name:d.name,type:lt.DIRECTORY,children:[],length:0}),this.registerFolder(t,A,d,n,a+1)}for(var T=0,_=i.subFolders();T<_.length;T++){var c=_[T],A=t.length;t[e].children.push(A),t.push({name:c.name,type:lt.DIRECTORY,children:[],length:0}),this.registerFolder(t,A,c,n,a+1)}},r.prototype.fieldsRecipAndAttachmentProperties=function(t,e,i){var n=e.provider(),a=new $.default(n,8,$.default.LITTLE_ENDIAN);this.importPropertiesFromFile(t,a,i)},r.prototype.importPropertiesFromFile=function(t,e,i){for(var n={64:function(f){var h=f.getUint32(0,!0)+4294967296*f.getUint32(4,!0);return new Date(Ce(h)).toUTCString()}},a=function(){var f=e.readUint32();if(f===0)return"break";var h=e.readUint32(),p=e.readUint8Array(8);t.propertyObserver(i,f,p);var l=(0,pt.toHex2)(f/65536&65535),y=(0,pt.toHex2)(f&65535);o.setDecodedFieldTo(t,i,o.decodeField(l,y,function(){return p},t.ansiEncoding,!0))},o=this;!e.isEof();){var s=a();if(s==="break")break}},r.prototype.fieldsRootProperties=function(t,e,i){var n=e.provider(),a=new $.default(n,32,$.default.LITTLE_ENDIAN);this.importPropertiesFromFile(t,a,i)},r.prototype.fieldsDataDir=function(t,e,i,n,a){for(var o=0,s=e.subFolders();o<s.length;o++){var f=s[o];this.fieldsDataDirInner(t,f,i,n)}for(var h=0,p=e.fileNameSets();h<p.length;h++){var l=p[h];l.name.indexOf(k.default.MSG.FIELD.PREFIX.DOCUMENT)==0?this.fieldsDataDocument(t,l,n):l.name==="__properties_version1.0"&&(a==="recip"||a==="attachment"||a==="sub"?this.fieldsRecipAndAttachmentProperties(t,l,n):a==="root"&&this.fieldsRootProperties(t,l,n))}},r.prototype.fieldsNameIdDir=function(t,e,i,n){for(var a=void 0,o=void 0,s=void 0,f=0,h=e.fileNameSets();f<h.length;f++){var p=h[f];if(p.name.indexOf(k.default.MSG.FIELD.PREFIX.DOCUMENT)==0){var l=p.name.substring(12).toLowerCase(),y=l.substring(0,4),d=l.substring(4,8);y==="0002"&&d==="0102"?a=p.provider():y==="0003"&&d==="0102"?s=p.provider():y==="0004"&&d==="0102"&&(o=p.provider())}}if(a!==void 0&&o!==void 0&&s!==void 0)for(var A=(0,ni.parse)(s),T=new $.default(o,0,$.default.LITTLE_ENDIAN),_=0,c=A;_<c.length;_++){var I=c[_];if(I.isStringProperty){T.seek(I.key);var b=T.readUint32();this.privatePidToKeyed[32768|I.propertyIndex]={useName:!0,name:T.readUCS2String(b/2)}}else this.privatePidToKeyed[32768|I.propertyIndex]={useName:!1,propertySet:I.guidIndex===1?"00020328-00000-0000-C000-00000000046":I.guidIndex===2?"00020329-00000-0000-C000-00000000046":(0,pt.msftUuidStringify)(a,16*(I.guidIndex-3)),propertyLid:I.key}}},r.prototype.fieldsDataReader=function(t){var e={dataType:"msg",attachments:[],recipients:[]};return this.fieldsDataDir(t,this.reader.rootFolder(),this.reader.rootFolder(),e,"root"),e},r.prototype.parseMsgData=function(t){return this.reader.parse(),this.fieldsDataReader(t)},r.prototype.getFileData=function(){var t,e,i;if(this.fieldsData===void 0){if(!this.reader.isMSGFile())return{dataType:null,error:"Unsupported file type!"};this.innerMsgBurners={},this.privatePidToKeyed={},this.fieldsData=this.parseMsgData({propertyObserver:((t=this.parserConfig)===null||t===void 0?void 0:t.propertyObserver)||(function(){}),includeRawProps:!!(!((e=this.parserConfig)===null||e===void 0)&&e.includeRawProps),ansiEncoding:(0,pt.emptyToNull)((i=this.parserConfig)===null||i===void 0?void 0:i.ansiEncoding)})}return this.fieldsData},r.prototype.getAttachment=function(t){var e=typeof t=="number"?this.fieldsData.attachments[t]:t;if(e.innerMsgContent===!0&&typeof e.folderId=="number")return{fileName:e.name+".msg",content:this.innerMsgBurners[e.folderId]()};var i=this.reader.readFileOf(e.dataId);return{fileName:e.fileName,content:i}},r})();R.default=fi});var Ye=L(j=>{"use strict";w();var hi=j&&j.__createBinding||(Object.create?(function(r,t,e,i){i===void 0&&(i=e);var n=Object.getOwnPropertyDescriptor(t,e);(!n||("get"in n?!t.__esModule:n.writable||n.configurable))&&(n={enumerable:!0,get:function(){return t[e]}}),Object.defineProperty(r,i,n)}):(function(r,t,e,i){i===void 0&&(i=e),r[i]=t[e]})),pi=j&&j.__exportStar||function(r,t){for(var e in r)e!=="default"&&!Object.prototype.hasOwnProperty.call(t,e)&&hi(t,r,e)},li=j&&j.__importDefault||function(r){return r&&r.__esModule?r:{default:r}};Object.defineProperty(j,"__esModule",{value:!0});var ci=li(Vt());pi(Vt(),j);j.default=ci.default});w();var Zt=$t(Ye());window.FlowMsgReader=Zt.default.default||Zt.default;})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)
*/

;
// Opret fra mail: læser .eml/.msg eller indsat tekst og foreslår titel, beskrivelse, deadline, område, prioritet og checkliste.
(function () {
  const MON = { jan: 0, januar: 0, feb: 1, februar: 1, mar: 2, marts: 2, apr: 3, april: 3, maj: 4, jun: 5, juni: 5, jul: 6, juli: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10, dec: 11, december: 11 };
  const WDN = { mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4, fredag: 5, 'lørdag': 6, 'søndag': 0 };
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const at12 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  const toWorkday = (d) => { const w = d.getDay(); return w === 6 ? addD(d, -1) : w === 0 ? addD(d, -2) : d; };

  // ---------- Filer ----------
  function decodeQP(s, cs) {
    const bytes = []; s = s.replace(/=\r?\n/g, '');
    for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else bytes.push(s.charCodeAt(i) & 255); }
    return dec(new Uint8Array(bytes), cs);
  }
  function dec(u8, cs) { try { return new TextDecoder((cs || 'utf-8').toLowerCase()).decode(u8); } catch (e) { return new TextDecoder('windows-1252').decode(u8); } }
  function b64(s, cs) { try { const bin = atob(s.replace(/\s+/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return dec(u, cs); } catch (e) { return ''; } }
  function hdrWord(s) { // =?utf-8?Q?...?= / =?utf-8?B?...?=
    return (s || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (m, cs, enc, txt) => enc.toUpperCase() === 'B' ? b64(txt, cs) : decodeQP(txt.replace(/_/g, ' '), cs));
  }
  function splitHead(raw) { const i = raw.search(/\r?\n\r?\n/); const head = i < 0 ? raw : raw.slice(0, i), body = i < 0 ? '' : raw.slice(i).replace(/^\r?\n\r?\n/, '');
    const h = {}; head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach((l) => { const m = /^([\w-]+):\s*(.*)$/.exec(l); if (m) h[m[1].toLowerCase()] = m[2]; }); return { h, body }; }
  function partText(raw) { // returnerer { text, html }
    const { h, body } = splitHead(raw); const ct = h['content-type'] || 'text/plain', cs = (/charset="?([^";]+)/i.exec(ct) || [])[1], te = (h['content-transfer-encoding'] || '').toLowerCase();
    const bd = /boundary="?([^";]+)"?/i.exec(ct);
    if (/multipart/i.test(ct) && bd) { const out = { text: '', html: '' };
      body.split('--' + bd[1]).slice(1).forEach((p) => { if (/^--/.test(p)) return; const r = partText(p.replace(/^\r?\n/, '')); if (!out.text && r.text) out.text = r.text; if (!out.html && r.html) out.html = r.html; }); return out; }
    if (/attachment/i.test(h['content-disposition'] || '')) return { text: '', html: '' };
    const txt = te === 'base64' ? b64(body, cs) : te === 'quoted-printable' ? decodeQP(body, cs) : body;
    return /text\/html/i.test(ct) ? { text: '', html: txt } : /text\/plain/i.test(ct) ? { text: txt, html: '' } : { text: '', html: '' };
  }
  function htmlToText(html) {
    const d = new DOMParser().parseFromString(html, 'text/html'); d.querySelectorAll('style,script,head').forEach((x) => x.remove());
    d.querySelectorAll('br').forEach((x) => x.replaceWith('\n')); d.querySelectorAll('p,div,li,tr,h1,h2,h3,h4').forEach((x) => { x.append('\n'); });
    d.querySelectorAll('li').forEach((x) => x.prepend('- '));
    return (d.body ? d.body.textContent : '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }
  function parseAddr(s) { s = hdrWord(s || ''); const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(s); return m ? { name: m[1].trim(), email: m[2].trim() } : { name: '', email: s.trim() }; }
  function readEml(raw) {
    const { h } = splitHead(raw); const p = partText(raw); const from = parseAddr(h.from);
    return { subject: hdrWord(h.subject || ''), fromName: from.name, fromEmail: from.email, date: h.date ? new Date(h.date) : null, body: p.text || (p.html ? htmlToText(p.html) : '') };
  }
  function readMsg(buf) {
    const R = window.FlowMsgReader; const r = new R(buf); const f = r.getFileData();
    let body = f.body || ''; if (!body && f.bodyHtml) body = htmlToText(f.bodyHtml);
    const dt = f.messageDeliveryTime || f.clientSubmitTime || f.creationTime;
    return { subject: f.subject || '', fromName: f.senderName || '', fromEmail: f.senderSmtpAddress || f.senderEmail || '', date: dt ? new Date(dt) : null, body };
  }
  function readFile(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader(), isMsg = /\.msg$/i.test(file.name);
      fr.onerror = () => rej(new Error('Filen kunne ikke læses.'));
      fr.onload = () => { try {
        if (isMsg) res(readMsg(fr.result));
        else { const u = new Uint8Array(fr.result); const raw = new TextDecoder('utf-8').decode(u); res(/^[\w-]+:/m.test(raw.slice(0, 2000)) && /\r?\n\r?\n/.test(raw) && /^(from|subject|date|received|mime-version|return-path):/im.test(raw) ? readEml(raw) : { subject: '', body: raw }); }
      } catch (e) { rej(new Error('Mailen kunne ikke læses. Prøv at kopiere teksten ind i stedet.')); } };
      fr.readAsArrayBuffer(file);
    });
  }

  // ---------- Indsat tekst ----------
  function fromPasted(text) {
    const t = (text || '').replace(/\r/g, ''); const out = { subject: '', fromName: '', fromEmail: '', date: null, body: t };
    // Outlook-kopier/videresendt: "Fra: … Sendt: … Til: … Emne: …" øverst
    const lines = t.split('\n'); const head = {}; let k = 0;
    for (; k < Math.min(lines.length, 12); k++) { const m = /^\s*(Fra|From|Sendt|Sent|Dato|Date|Til|To|Cc|Emne|Subject)\s*:\s*(.*)$/i.exec(lines[k]); if (m) head[m[1].toLowerCase()] = m[2]; else if (lines[k].trim() && Object.keys(head).length) break; }
    if (head.emne || head.subject) { out.subject = head.emne || head.subject; const a = parseAddr(head.fra || head.from || ''); out.fromName = a.name || a.email; out.fromEmail = a.name ? a.email : '';
      const ds = head.sendt || head.sent || head.dato || head.date; if (ds) out.date = parseLongDate(ds); out.body = lines.slice(k).join('\n'); }
    return out;
  }
  function parseLongDate(s) { const m = /(\d{1,2})\.?\s+([a-zæøå]+)\s+(\d{4})/i.exec(s || ''); if (m && MON[m[2].toLowerCase()] !== undefined) return new Date(+m[3], MON[m[2].toLowerCase()], +m[1], 12); const d = new Date(s); return isNaN(d) ? null : d; }

  // ---------- Rens ----------
  const QUOTE = [/^-{2,}\s*(Original Message|Oprindelig meddelelse|Videresendt meddelelse|Forwarded message)/i, /^_{8,}\s*$/, /^\s*(Fra|From)\s*:.+$/i, /^Den .{4,80} skrev .{0,80}:\s*$/i, /^On .{4,80} wrote:\s*$/i, /^\s*>/];
  const SIG = /^\s*(med venlig hilsen|venlig hilsen|de bedste hilsner|bedste hilsner|mange hilsner|hilsen|kh|vh|mvh|m\.v\.h\.|best regards|kind regards|regards|cheers|tak på forhånd|på forhånd tak)\b[\s,.!]*$/i;
  function cleanBody(body) {
    const lines = (body || '').replace(/\r/g, '').split('\n'); let own = [], rest = [], cut = -1;
    for (let i = 0; i < lines.length; i++) { if (QUOTE.some((r) => r.test(lines[i]))) { cut = i; break; } }
    own = cut < 0 ? lines : lines.slice(0, cut); rest = cut < 0 ? [] : lines.slice(cut);
    const trimSig = (ls) => { const j = ls.findIndex((l) => SIG.test(l)); return j >= 0 ? ls.slice(0, j) : ls; };
    let text = trimSig(own).join('\n').trim();
    // Kun en kort følgetekst ("Se nedenfor") → brug den videresendte mail
    if (text.replace(/\s/g, '').length < 40 && rest.length) {
      let r = rest.slice(1); const hi = r.findIndex((l) => /^\s*(Emne|Subject)\s*:/i.test(l)); if (hi >= 0 && hi < 10) r = r.slice(hi + 1);
      const inner = trimSig(r.filter((l) => !/^\s*(Fra|From|Sendt|Sent|Til|To|Cc|Dato|Date)\s*:/i.test(l)).map((l) => l.replace(/^\s*>\s?/, ''))).join('\n').trim();
      text = (text ? text + '\n\n' : '') + inner;
    }
    return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '');
  }
  const cleanSubject = (s) => { let x = (s || '').trim(), y; do { y = x; x = x.replace(/^\s*(sv|vs|re|fw|fwd|aw|wg|tr|vb)\s*(\[\d+\])?\s*:\s*/i, ''); } while (x !== y); return x.replace(/\s+/g, ' ').trim(); };

  // ---------- Deadline ----------
  function findDeadline(text, base) {
    base = at12(base || new Date()); const low = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    const cands = [];
    const add = (d, idx) => { if (!d || isNaN(d)) return; d = at12(d); if (d < addD(base, -1)) return; const before = low.slice(Math.max(0, idx - 30), idx);
      const w = /(senest|inden|deadline|frist|før|til og med|skal være klar|klar til|færdig|by|before|due)/.test(before) ? 2 : 1; cands.push({ d, w, idx }); };
    let m; const re = (r, f) => { r.lastIndex = 0; while ((m = r.exec(low))) f(m); };
    re(/\b(i dag|today)\b/g, (x) => add(base, x.index));
    re(/\b(i morgen|tomorrow)\b/g, (x) => add(addD(base, 1), x.index));
    re(/\bi overmorgen\b/g, (x) => add(addD(base, 2), x.index));
    re(/\b(?:på |senest |inden |til |førstkommende |næste )?(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/g, (x) => {
      const t = WDN[x[1]]; let n = (t - base.getDay() + 7) % 7; if (n === 0) n = 7; if (/næste /.test(x[0]) && n < 7 && base.getDay() !== 0 && t > base.getDay()) n += 7; add(addD(base, n), x.index); });
    re(/\b(?:inden|før|til) (?:weekenden|weekend)\b/g, (x) => add(addD(base, (5 - base.getDay() + 7) % 7), x.index));
    re(/\b(?:i )?(?:slutningen af|ultimo) (?:ugen)\b/g, (x) => add(addD(base, (5 - base.getDay() + 7) % 7), x.index));
    re(/\bnæste uge\b/g, (x) => add(addD(base, ((1 - base.getDay() + 7) % 7 || 7) + 4), x.index));
    re(/\buge (\d{1,2})\b/g, (x) => { const wk = +x[1]; if (wk < 1 || wk > 53) return; let y = base.getFullYear(); const f = (yy) => { const j4 = new Date(yy, 0, 4, 12); const mon = addD(j4, -((j4.getDay() + 6) % 7)); return addD(mon, (wk - 1) * 7 + 4); }; let d = f(y); if (d < addD(base, -3)) d = f(y + 1); add(d, x.index); });
    re(/\b(?:i )?(?:slutningen af|ultimo) (?:måneden)\b/g, (x) => add(toWorkday(new Date(base.getFullYear(), base.getMonth() + 1, 0, 12)), x.index));
    re(/\b(?:d\.|den)?\s?(\d{1,2})\.?\s?(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|okt|nov|dec)\.?(?:\s(\d{4}))?\b/g, (x) => {
      const mo = MON[x[2]]; let y = x[3] ? +x[3] : base.getFullYear(); let d = new Date(y, mo, +x[1], 12); if (!x[3] && d < addD(base, -1)) d = new Date(y + 1, mo, +x[1], 12); add(d, x.index); });
    re(/\b(?:d\.|den)?\s?(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g, (x) => {
      const dd = +x[1], mm = +x[2]; if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return; if (/\d[.,]\d{1,2}\s*(kr|t|timer|%|mio)/.test(low.slice(x.index, x.index + 12))) return;
      let y = x[3] ? (+x[3] < 100 ? 2000 + +x[3] : +x[3]) : base.getFullYear(); let d = new Date(y, mm - 1, dd, 12); if (d.getMonth() !== mm - 1) return; if (!x[3] && d < addD(base, -1)) d = new Date(y + 1, mm - 1, dd, 12); add(d, x.index); });
    if (!cands.length) return null;
    cands.sort((a, b) => b.w - a.w || a.idx - b.idx); return iso(cands[0].d);
  }

  // ---------- Samlet forslag ----------
  const AREA_WORDS = [
    [/e-?mail|klaviyo|nyhedsbrev|newsletter|flow(s)?\b|kampagnemail|weekletter|udsendelse/, 'e-mail'],
    [/relewise|nulsøgning|søgeresultat|merchandising|synonym/, 'relewise'],
    [/\bseo\b|søgeord|search console|ranking|meta ?title|meta ?beskrivelse|backlink|topic cluster/, 'seo'],
    [/\bpaid\b|meta ads|facebook|instagram|tiktok|pinterest|google ads|annonce|kampagnebudget|\bpmax\b|\bads\b/, 'paid'],
    [/wexo|shopware|webshop ?fejl|\bbug\b|deploy|udvikling|frontend|checkout/, 'wexo'],
    [/\bavis(en)?\b|avisside|avisen/, 'avis'],
    [/inriver|\bpim\b|produktdata|varedata|stamdata|produktnavn|variant|ean|attribut/, 'produkt'],
    [/\bga4\b|analytics|rapport|dashboard|power bi|statistik|tracking|konvertering/, 'analyse']
  ];
  function suggest(mail, ctx) {
    const subject = cleanSubject(mail.subject), body = cleanBody(mail.body), all = (subject + '\n' + body).toLowerCase();
    let title = subject;
    if (!title) { const first = body.split('\n').map((l) => l.trim()).find((l) => l.length > 3 && !/^(hej|hi|hello|kære|dear)\b/i.test(l)) || ''; title = first.split(/(?<=[.!?])\s/)[0].slice(0, 90); }
    // Område: navne fra Flow + nøgleord
    const score = {}; (ctx.areas || []).forEach((a) => { const n = a.name.toLowerCase(); let s = 0;
      if (n.length > 2 && all.indexOf(n) >= 0) s += 3;
      AREA_WORDS.forEach(([r, key]) => { if (n.indexOf(key) >= 0 || (key === 'produkt' && /produkt/.test(n)) || (key === 'analyse' && /analyse/.test(n))) { const hits = all.match(new RegExp(r.source, 'g')); if (hits) s += hits.length; } });
      if (s) score[a.id] = s; });
    const areas = Object.keys(score).sort((x, y) => score[y] - score[x]).slice(0, 2);
    // Personer nævnt i teksten → medlemmer
    const people = (ctx.people || []).filter((p) => p.id !== ctx.me && p.name && new RegExp('(^|[^\\wæøå])@?' + p.name.split(' ')[0].toLowerCase() + '([^\\wæøå]|$)').test(all)).map((p) => p.id);
    const prio = /haster|hurtigst muligt|asap|akut|urgent|vigtigt|kritisk|straks/.test(all) ? 'hoej' : 'normal';
    // Punktlister → checkliste
    const items = body.split('\n').map((l) => /^\s*(?:[-•*–·▪]|\d{1,2}[.)])\s+(.{3,160})$/.exec(l)).filter(Boolean).map((m) => m[1].trim()).slice(0, 12);
    const due = findDeadline(subject + '\n' + body, mail.date && !isNaN(mail.date) ? mail.date : new Date());
    const fromLine = (mail.fromName || mail.fromEmail) ? 'Fra mail: ' + [mail.fromName, mail.fromEmail ? '<' + mail.fromEmail + '>' : ''].filter(Boolean).join(' ') + (mail.date && !isNaN(mail.date) ? ' · ' + mail.date.getDate() + '/' + (mail.date.getMonth() + 1) + ' ' + mail.date.getFullYear() : '') : '';
    const desc = (fromLine ? fromLine + '\n\n' : '') + (body.length > 3000 ? body.slice(0, 3000) + '…' : body);
    return { title: title || 'Opgave fra mail', desc, due, areas, members: people, prio, items, from: mail.fromName || mail.fromEmail || '' };
  }
  window.FlowMail = { readFile, fromPasted, suggest, _findDeadline: findDeadline, _cleanBody: cleanBody };
})();

;
// GENERATED by tools/compile.mjs from src/template.html — edit the template, not this file.
(function(){
const React = window.React; const h = React.createElement; const Frag = React.Fragment;
const F = (p, ...c) => h(Frag, p, ...c);
const cssCache = new Map();
function CS(s){ if (s == null) return undefined; if (typeof s !== 'string') return s; let o = cssCache.get(s); if (o) return o; o = {};
  for (const d of s.split(';')) { const i = d.indexOf(':'); if (i < 0) continue; const p = d.slice(0, i).trim(); if (!p) continue;
    o[p.startsWith('--') ? p : p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = d.slice(i + 1).trim(); }
  if (cssCache.size > 20000) cssCache.clear(); cssCache.set(s, o); return o; }
const Z = v => (v == null || typeof v === 'boolean') ? '' : v;
const DV = v => v == null ? '' : v;
function V(v){ if (v == null || typeof v === 'boolean') return null; if (React.isValidElement(v) || Array.isArray(v)) return v; return String(v); }
function M(list, S, as, fn){ if (!Array.isArray(list)) return null; return list.map((it, i) => { const s = Object.create(S); s[as] = it; s.$index = i; return h(Frag, { key: i }, ...fn(s)); }); }
const xc = new Map();
function R(S, src){ let f = xc.get(src); if (!f) { f = compileExpr(src); xc.set(src, f); } return f(S); }
function compileExpr(e){
  e = e.trim();
  if (e[0] === '(' && e[e.length - 1] === ')' && wraps(e)) return compileExpr(e.slice(1, -1));
  const eq = topEq(e);
  if (eq) { const l = compileExpr(e.slice(0, eq.i)), r = compileExpr(e.slice(eq.i + eq.op.length));
    return eq.op === '===' ? S => l(S) === r(S) : eq.op === '!==' ? S => l(S) !== r(S) : eq.op === '==' ? S => l(S) == r(S) : S => l(S) != r(S); }
  if (e[0] === '!') { const f = compileExpr(e.slice(1)); return S => !f(S); }
  if (e === 'true') return () => true; if (e === 'false') return () => false; if (e === 'null') return () => null; if (e === 'undefined') return () => undefined;
  if (/^-?\d+(\.\d+)?$/.test(e)) { const n = Number(e); return () => n; }
  if (e.length >= 2 && (e[0] === '"' || e[0] === "'") && e[e.length - 1] === e[0]) { const s = e.slice(1, -1); return () => s; }
  const steps = []; const hm = e.match(/^[A-Za-z_$][\w$]*/); if (!hm) return () => undefined;
  steps.push(() => hm[0]); let i = hm[0].length;
  while (i < e.length) {
    if (e[i] === '.') { const m = e.slice(i + 1).match(/^[A-Za-z_$][\w$]*|^\d+/); if (!m) return () => undefined; const k = m[0]; steps.push(() => k); i += 1 + k.length; }
    else if (e[i] === '[') { let d = 1, j = i + 1; while (j < e.length && d > 0) { if (e[j] === '[') d++; else if (e[j] === ']') { d--; if (!d) break; } j++; }
      const f = compileExpr(e.slice(i + 1, j)); steps.push(f); i = j + 1; }
    else return () => undefined;
  }
  return S => { let cur = S; for (let k = 0; k < steps.length; k++) { if (cur == null) return undefined; cur = cur[steps[k](S)]; } return cur; };
}
function wraps(e){ let d = 0; for (let i = 0; i < e.length - 1; i++) { if (e[i] === '(') d++; else if (e[i] === ')') { d--; if (!d) return false; } } return true; }
function topEq(e){ let d = 0; for (let i = 0; i < e.length; i++) { const c = e[i]; if (c === '[' || c === '(') d++; else if (c === ']' || c === ')') d--;
  else if (!d && (c === '=' || c === '!') && e[i + 1] === '=') { if (i > 0 && (e[i - 1] === '=' || e[i - 1] === '!')) continue; if (!e.slice(0, i).trim()) continue;
    return { i, op: e[i + 2] === '=' ? c + '==' : c + '=' }; } } return null; }
function render(S){ return F(null, h("div",{style:CS("display:flex;height:100vh;min-height:760px;font-family:'Instrument Sans',system-ui,sans-serif;color:#231F20;background:#FAF9F6;overflow-x:auto;overflow-y:hidden")},"\n\n  ",h("div",{style:CS("width:236px;flex:none;background:#231F20;color:#FAF9F6;display:flex;flex-direction:column")},"\n    ",h("div",{style:CS("padding:20px 18px 16px 18px;display:flex;align-items:center;gap:9px")},"\n      ",h("div",{style:CS("width:22px;height:22px;background:#0031EB;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-weight:700;font-size:13px;color:#fff")},"F"),"\n      ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:14.5px;letter-spacing:-0.01em")},"Flow"),"\n    "),"\n\n    ",h("div",{style:CS("padding:0 10px;display:flex;flex-direction:column;gap:1px")},"\n      ",M(R(S,"navMain"),S,"n",(S)=>["\n        ",h("div",{"onClick":R(S,"n.onClick"),style:CS(("display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:4px;cursor:pointer;font-size:13.5px;font-weight:"+Z(R(S,"n.weight"))+";color:"+Z(R(S,"n.color"))+";background:"+Z(R(S,"n.bg")))),className:"fp0"},"\n          ",h("div",{style:CS("width:15px;text-align:center;font-size:12px;opacity:.85")},V(R(S,"n.icon"))),"\n          ",h("div",{style:CS("flex:1")},V(R(S,"n.label"))),"\n          ",(R(S,"n.badge")?F(null,"\n            ",h("div",{style:CS("background:#0031EB;color:#fff;font-size:10.5px;font-weight:600;min-width:17px;height:17px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px")},V(R(S,"n.badge"))),"\n          "):null),"\n        "),"\n      "]),"\n    "),"\n\n    ",h("div",{style:CS("padding:20px 18px 7px 18px;font-size:10.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#6E675F")},"Visninger"),"\n    ",h("div",{style:CS("padding:0 10px;display:flex;flex-direction:column;gap:1px")},"\n      ",M(R(S,"navViews"),S,"n",(S)=>["\n        ",h("div",{"onClick":R(S,"n.onClick"),style:CS(("display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:4px;cursor:pointer;font-size:13.5px;font-weight:"+Z(R(S,"n.weight"))+";color:"+Z(R(S,"n.color"))+";background:"+Z(R(S,"n.bg")))),className:"fp0"},"\n          ",h("div",{style:CS("width:15px;text-align:center;font-size:12px;opacity:.85")},V(R(S,"n.icon"))),"\n          ",h("div",{style:CS("flex:1")},V(R(S,"n.label"))),"\n        "),"\n      "]),"\n    "),"\n\n    ",h("div",{style:CS("padding:20px 18px 7px 18px;font-size:10.5px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#6E675F")},"Områder"),"\n    ",h("div",{style:CS("padding:0 10px;display:flex;flex-direction:column;gap:1px;overflow-y:auto")},"\n      ",M(R(S,"projectNav"),S,"p",(S)=>["\n        ",h("div",{"onClick":R(S,"p.onClick"),style:CS(("display:flex;align-items:center;gap:9px;padding:5px 8px;border-radius:4px;font-size:12.5px;cursor:pointer;background:"+Z(R(S,"p.bg"))+";color:"+Z(R(S,"p.text")))),className:"fp0"},"\n          ",h("div",{style:CS(("width:7px;height:7px;border-radius:2px;flex:none;background:"+Z(R(S,"p.color"))))}),"\n          ",h("div",{style:CS("flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"p.name"))),"\n          ",h("div",{style:CS("font-size:11px;color:#6E675F;font-variant-numeric:tabular-nums")},V(R(S,"p.open"))),"\n        "),"\n      "]),"\n    "),"\n\n    ",h("div",{style:CS("margin-top:auto;border-top:1px solid #3A3533;padding:11px 10px")},"\n      ",h("div",{style:CS("display:flex;align-items:center;gap:9px;padding:5px 8px")},"\n        ",h("div",{style:CS(("width:21px;height:21px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9.5px;font-weight:600;color:#fff;background:"+Z(R(S,"meRow.color"))))},V(R(S,"meRow.initials"))),"\n        ",h("div",{style:CS("flex:1;min-width:0;font-size:12.5px;color:#FAF9F6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"meRow.name"))),"\n        ",h("div",{"onClick":R(S,"onOpenPeople"),"title":"Redigér team",style:CS(("cursor:pointer;font-size:11px;color:"+Z(R(S,"teamColor")))),className:"fp1"},F(null,"Team",V(R(S,"teamBadge")))),"\n        ",h("div",{"onClick":R(S,"onLogout"),"title":"Log ud",style:CS("cursor:pointer;font-size:11px;color:#6E675F;margin-left:6px"),className:"fp1"},"Log ud"),"\n      "),"\n    "),"\n  "),"\n\n  ",h("div",{style:CS("flex:1;display:flex;flex-direction:column;min-width:1040px;background:#EFECE6")},"\n    ",h("div",{style:CS("height:56px;flex:none;border-bottom:1px solid #DFDBD3;background:#fff;display:flex;align-items:center;gap:14px;padding:0 22px")},"\n      ",h("div",{style:CS("min-width:0")},"\n        ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:16px;letter-spacing:-0.015em")},V(R(S,"viewTitle"))),"\n        ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:1px")},V(R(S,"viewSub"))),"\n      "),"\n      ",h("div",{style:CS("flex:1")}),"\n      ",(R(S,"timer")?F(null,"\n        ",h("div",{style:CS("display:flex;align-items:center;gap:9px;border:1px solid #0031EB;background:#E7ECFE;border-radius:4px;padding:5px 9px")},"\n          ",h("div",{style:CS("width:6px;height:6px;border-radius:50%;background:#0031EB;animation:pulseDot 1.6s infinite")}),"\n          ",h("div",{style:CS("font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"timer.title"))),"\n          ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;color:#0031EB")},V(R(S,"timer.clock"))),"\n          ",h("div",{"onClick":R(S,"timer.onStop"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;color:#0031EB;border-left:1px solid #9FC4DB;padding-left:9px")},"Stop"),"\n        "),"\n      "):null),"\n      ",h("div",{"onClick":R(S,"onSearchOpen"),style:CS("cursor:pointer;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:6px 13px;font-size:12.5px;font-weight:600;color:#4A443F;background:#fff"),className:"fp2"},"Søg"),"\n      ",(R(S,"srch")?F(null,"\n        ",h("div",{"data-bd":"1","onClick":R(S,"srch.onClose"),style:CS("position:fixed;inset:0;z-index:9000;background:rgba(35,31,32,0.28);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh")},"\n          ",h("div",{"onClick":R(S,"stopClick"),style:CS("width:560px;max-width:calc(100vw - 40px);background:#fff;border-radius:8px;box-shadow:0 18px 50px rgba(35,31,32,0.25);overflow:hidden")},"\n            ",h("input",{"ref":R(S,"srch.inputRef"),"value":DV(R(S,"srch.q")),"onChange":R(S,"srch.onQ"),"onKeyDown":R(S,"srch.onKey"),"placeholder":"Søg i opgaver",style:CS("width:100%;border:none;border-bottom:1px solid #E9E6E0;padding:15px 18px;font-size:15px;font-family:inherit;color:#231F20;outline:none;box-sizing:border-box")}),"\n            ",h("div",{style:CS("max-height:52vh;overflow-y:auto;padding:6px")},"\n              ",M(R(S,"srch.rows"),S,"r",(S)=>["\n                ",h("div",{"onClick":R(S,"r.onOpen"),"onMouseEnter":R(S,"r.onHover"),style:CS(("cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:5px;background:"+Z(R(S,"r.bg"))))},"\n                  ",h("div",{style:CS(("width:3px;height:26px;border-radius:2px;flex:none;background:"+Z(R(S,"r.color"))))}),"\n                  ",h("div",{style:CS("flex:1;min-width:0")},"\n                    ",h("div",{style:CS("font-size:13px;color:#231F20;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.title"))),"\n                    ",h("div",{style:CS("font-size:11px;color:#6E675F;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.sub"))),"\n                  "),"\n                  ",h("div",{style:CS("font-size:11px;color:#6E675F;flex:none")},V(R(S,"r.status"))),"\n                "),"\n              "]),"\n              ",(R(S,"srch.empty")?F(null,"\n                ",h("div",{style:CS("padding:18px 12px;font-size:12.5px;color:#6E675F;text-align:center")},"Ingen opgaver fundet"),"\n              "):null),"\n            "),"\n          "),"\n        "),"\n      "):null),"\n      ",(R(S,"canScope")?F(null,"\n        ",h("div",{"onClick":R(S,"onToggleMine"),style:CS(("cursor:pointer;display:flex;align-items:center;gap:8px;border:1px solid "+Z(R(S,"onlyMineBorder"))+";background:"+Z(R(S,"onlyMineBg"))+";color:"+Z(R(S,"onlyMineColor"))+";border-radius:4px;padding:6px 11px;font-size:12px;font-weight:600")),className:"fp3"},"\n          ",h("div",{style:CS(("width:17px;height:17px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:8px;font-weight:600;color:#fff;background:"+Z(R(S,"meColor"))))},V(R(S,"meInitials"))),F(null,"\n          ",V(R(S,"onlyMineLabel")),"\n        ")),"\n      "):null),"\n      ",(R(S,"filterName")?F(null,"\n        ",h("div",{style:CS("display:flex;align-items:center;gap:8px;border:1px solid #DFDBD3;border-radius:4px;padding:5px 9px;background:#FAF9F6")},"\n          ",h("div",{style:CS(("width:7px;height:7px;border-radius:2px;background:"+Z(R(S,"filterColor"))))}),"\n          ",h("div",{style:CS("font-size:12px;color:#4A443F")},"Kun ",h("span",{style:CS("font-weight:600;color:#231F20")},V(R(S,"filterName")))),"\n          ",h("div",{"onClick":R(S,"onClearFilter"),style:CS("cursor:pointer;color:#9C948B;font-size:12px;line-height:1"),className:"fp4"},"✕"),"\n        "),"\n      "):null),"\n      ",h("div",{"onClick":R(S,"onNew"),style:CS("background:#231F20;color:#fff;border-radius:4px;padding:7px 13px;font-size:12.5px;font-weight:600;cursor:pointer"),className:"fp5"},"Ny opgave"),"\n    "),"\n\n    ",h("div",{style:CS("flex:1;overflow:auto;min-height:0")},h("div",{},"\n\n      ",(R(S,"isDay")?F(null,"\n        ",h("div",{style:CS("display:flex;gap:26px;padding:26px 26px 60px 26px;align-items:flex-start")},"\n          ",h("div",{style:CS("flex:1;min-width:0;display:flex;flex-direction:column;gap:22px")},"\n            ",(R(S,"handoffBanner")?F(null,"\n              ",h("div",{style:CS("border:1px solid #0031EB;background:#E7ECFE;border-radius:4px;padding:13px 15px;display:flex;gap:12px;align-items:center")},"\n                ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.07em;color:#fff;background:#0031EB;padding:3px 7px;border-radius:3px;flex:none")},"KLAR TIL DIG"),"\n                ",h("div",{style:CS("flex:1;font-size:13.5px")},V(R(S,"handoffBanner.text"))),"\n                ",h("div",{"onClick":R(S,"handoffBanner.onOpen"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;color:#0031EB;flex:none")},"Åbn opgaven →"),"\n                ",h("div",{"onClick":R(S,"handoffBanner.onDismiss"),"title":"Luk",style:CS("cursor:pointer;color:#6E9BD6;font-size:14px;line-height:1;flex:none;padding:2px 2px 2px 4px"),className:"fp6"},"✕"),"\n              "),"\n            "):null),"\n\n            ",h("div",{style:CS("display:flex;align-items:center;gap:5px")},"\n              ",M(R(S,"sortOpts"),S,"o",(S)=>["\n                ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n              "]),"\n            "),"\n\n            ",M(R(S,"daySections"),S,"s",(S)=>["\n              ",h("div",{},"\n                ",h("div",{style:CS("display:flex;align-items:baseline;gap:9px;margin-bottom:9px")},"\n                  ",h("div",{style:CS(("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;color:"+Z(R(S,"s.color"))))},V(R(S,"s.title"))),"\n                  ",h("div",{style:CS("font-size:11.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"s.count"))),"\n                  ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n                "),"\n                ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n                  ",M(R(S,"s.tasks"),S,"t",(S)=>["\n                    ",h("div",{"onClick":R(S,"t.onOpen"),style:CS("display:flex;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid #E9E6E0;cursor:pointer"),className:"fp7"},"\n                      ",h("div",{"onClick":R(S,"t.onCheck"),"title":"Markér som færdig",style:CS(("width:13px;height:13px;border-radius:3px;border:1.5px solid "+Z(R(S,"t.checkBorder"))+";background:"+Z(R(S,"t.checkFill"))+";flex:none;cursor:pointer"))}),"\n                      ",h("div",{"title":R(S,"t.project"),style:CS(("width:3px;height:22px;border-radius:2px;flex:none;background:"+Z(R(S,"t.projectColor"))))}),"\n                      ",h("div",{style:CS("flex:1;min-width:0;display:flex;align-items:center;gap:8px")},"\n                        ",h("div",{style:CS(("font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:"+Z(R(S,"t.titleColor"))))},V(R(S,"t.title"))),"\n                      "),"\n                      ",h("div",{style:CS("display:flex;align-items:center;justify-content:flex-end;gap:7px;width:74px;flex:none")},"\n                        ",(R(S,"t.recurring")?F(null,"\n                          ",h("div",{"title":R(S,"t.recurring"),style:CS("font-size:11.5px;color:#C9C4BA;line-height:1")},"↻"),"\n                        "):null),"\n                        ",(R(S,"t.rollPct")?F(null,"\n                          ",h("div",{"title":R(S,"t.rollLabel"),style:CS("width:44px;height:3px;border-radius:2px;background:#E9E6E0;overflow:hidden")},"\n                            ",h("div",{style:CS(("height:3px;width:"+Z(R(S,"t.rollPct"))+";background:#C9C4BA"))}),"\n                          "),"\n                        "):null),"\n                      "),"\n                      ",(R(S,"t.overLabel")?F(null,"\n                        ",h("div",{style:CS("font-size:11.5px;font-weight:700;color:#9C160D;flex:none;font-variant-numeric:tabular-nums")},V(R(S,"t.overLabel"))),"\n                      "):null),"\n                      ",(R(S,"t.prioMark")?F(null,"\n                        ",h("div",{"title":R(S,"t.prioLabel"),style:CS(("flex:none;width:12px;text-align:center;font-family:Archivo,sans-serif;font-size:15px;font-weight:700;line-height:1;color:"+Z(R(S,"t.prioMarkColor"))))},V(R(S,"t.prioMark"))),"\n                      "):null),"\n                      ",(R(S,"t.running")?F(null,"\n                        ",h("div",{style:CS("font-size:12px;font-weight:600;color:#0031EB;width:86px;flex:none;text-align:right;font-variant-numeric:tabular-nums")},V(R(S,"t.runLabel"))),"\n                      "):null),"\n                      ",(R(S,"t.notRunning")?F(null,"\n                        ",h("div",{style:CS(("font-size:12px;font-weight:500;color:"+Z(R(S,"t.dueColor"))+";width:86px;flex:none;text-align:right;font-variant-numeric:tabular-nums"))},V(R(S,"t.dueLabel"))),"\n                      "):null),"\n                      ",h("div",{"onClick":R(S,"t.onTimer"),"title":R(S,"t.timerLabel"),style:CS(("cursor:pointer;flex:none;width:26px;height:26px;border-radius:50%;border:1px solid "+Z(R(S,"t.timerBorder"))+";color:"+Z(R(S,"t.timerColor"))+";background:"+Z(R(S,"t.timerBg"))+";display:flex;align-items:center;justify-content:center;font-size:9px"))},V(R(S,"t.timerIcon"))),"\n                    "),"\n                  "]),"\n                "),"\n              "),"\n            "]),"\n\n          "),"\n\n          ",h("div",{style:CS("width:262px;flex:none;display:flex;flex-direction:column;gap:16px")},"\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:15px")},"\n              ",h("div",{style:CS("font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E675F")},"I dag"),"\n              ",h("div",{style:CS("display:flex;align-items:baseline;gap:6px;margin-top:9px")},"\n                ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:30px;font-weight:600;letter-spacing:-0.03em;font-variant-numeric:tabular-nums")},V(R(S,"todayHours"))),"\n                ",h("div",{style:CS("font-size:12.5px;color:#6E675F")},"registreret"),"\n              "),"\n              ",h("div",{style:CS("height:5px;background:#E9E6E0;border-radius:3px;margin-top:11px;overflow:hidden")},"\n                ",h("div",{style:CS(("height:100%;background:#0031EB;width:"+Z(R(S,"todayPct"))))}),"\n              "),"\n              ",h("div",{style:CS("font-size:11.5px;color:#9C948B;margin-top:6px")},F(null,"Mål 7,5 t · ",V(R(S,"todayRemain"))," tilbage")),"\n            "),"\n\n\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:15px")},"\n              ",h("div",{style:CS("font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E675F;margin-bottom:11px")},"Din uge"),"\n              ",M(R(S,"weekBars"),S,"w",(S)=>["\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:7px")},"\n                  ",h("div",{style:CS(("width:24px;font-size:11.5px;color:"+Z(R(S,"w.labelColor"))+";font-weight:"+Z(R(S,"w.weight"))))},V(R(S,"w.day"))),"\n                  ",h("div",{style:CS("flex:1;height:16px;background:#E9E6E0;border-radius:2px;overflow:hidden;position:relative")},"\n                    ",h("div",{style:CS(("position:absolute;left:0;top:0;bottom:0;background:"+Z(R(S,"w.color"))+";width:"+Z(R(S,"w.pct"))))}),"\n                  "),"\n                  ",h("div",{style:CS("width:30px;text-align:right;font-size:11px;color:#6E675F;font-variant-numeric:tabular-nums")},V(R(S,"w.hours"))),"\n                "),"\n              "]),"\n            "),"\n\n            ",(R(S,"ongoingShow")?F(null,"\n              ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:15px")},"\n                ",h("div",{style:CS("display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px")},"\n                  ",h("div",{style:CS("font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E675F")},"Løbende arbejde"),"\n                  ",h("div",{"onClick":R(S,"onOpenLob"),style:CS("font-size:11.5px;color:#6E675F;cursor:pointer"),className:"fp8"},"Se alle →"),"\n                "),"\n                ",(R(S,"ongoingEmpty")?F(null,"\n                  ",h("div",{style:CS("font-size:12px;color:#9C948B;line-height:1.5")},"Ingen endnu. Vælg Type: Løbende arbejde på en opgave, så kommer den her."),"\n                "):null),"\n                ",h("div",{style:CS("display:flex;flex-direction:column;gap:2px")},"\n                  ",M(R(S,"ongoing"),S,"o",(S)=>["\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:8px;padding:4px 0")},"\n                      ",h("div",{style:CS(("width:3px;height:16px;border-radius:2px;flex:none;background:"+Z(R(S,"o.color"))))}),"\n                      ",h("div",{"onClick":R(S,"o.onOpen"),"title":R(S,"o.title"),style:CS("flex:1;min-width:0;cursor:pointer;font-size:12.5px;color:#231F20;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"),className:"fp8"},V(R(S,"o.title"))),"\n                      ",h("div",{style:CS(("font-size:11px;color:"+Z(R(S,"o.timeColor"))+";font-variant-numeric:tabular-nums;flex:none"))},V(R(S,"o.time"))),"\n                      ",h("div",{"onClick":R(S,"o.onTimer"),"title":R(S,"o.timerTitle"),style:CS(("cursor:pointer;flex:none;width:22px;height:22px;border-radius:50%;box-sizing:border-box;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.fg"))+";display:flex;align-items:center;justify-content:center;font-size:8px")),className:"fp9"},V(R(S,"o.icon"))),"\n                    "),"\n                  "]),"\n                "),"\n              "),"\n            "):null),"\n\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:15px")},"\n              ",h("div",{style:CS("font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E675F;margin-bottom:11px")},"Noter"),"\n              ",h("div",{style:CS("display:flex;flex-direction:column;gap:8px")},"\n                ",M(R(S,"stickies"),S,"n",(S)=>["\n                  ",h("div",{style:CS(("border:1px solid "+Z(R(S,"n.border"))+";background:"+Z(R(S,"n.bg"))+";border-radius:4px;padding:9px 10px"))},"\n                    ",h("div",{style:CS("font-size:12px;color:#231F20;line-height:1.5;text-wrap:pretty")},V(R(S,"n.text"))),"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:7px;margin-top:7px")},"\n                      ",h("div",{style:CS(("font-size:10px;font-weight:600;letter-spacing:.04em;color:"+Z(R(S,"n.badgeColor"))))},V(R(S,"n.badge"))),"\n                      ",h("div",{style:CS("font-size:10px;color:#9C948B")},V(R(S,"n.when"))),"\n                      ",h("div",{style:CS("flex:1")}),"\n                      ",(R(S,"n.own")?F(null,"\n                        ",h("div",{"onClick":R(S,"n.onShare"),style:CS("cursor:pointer;font-size:10.5px;font-weight:600;color:#0031EB")},V(R(S,"n.shareLabel"))),"\n                      "):null),"\n                      ",(R(S,"n.own")?F(null,"\n                        ",h("div",{"onClick":R(S,"n.onDelete"),style:CS("cursor:pointer;font-size:11px;color:#C9C4BA"),className:"fp4"},"✕"),"\n                      "):null),"\n                    "),"\n                  "),"\n                "]),"\n                ",h("textarea",{"value":DV(R(S,"noteDraft")),"onChange":R(S,"onNoteChange"),"onKeyDown":R(S,"onNoteKey"),"rows":"2","placeholder":"Skriv en note til dig selv",style:CS("width:100%;border:1px dashed #C9C4BA;border-radius:4px;padding:8px 9px;font-size:12px;font-family:inherit;line-height:1.45;color:#231F20;background:#FAF9F6;outline:none;resize:vertical"),className:"fpa"}),"\n                ",h("div",{"onClick":R(S,"onNoteAdd"),style:CS("cursor:pointer;text-align:center;font-size:11.5px;font-weight:600;padding:6px;border-radius:3px;border:1px solid #DFDBD3;color:#4A443F;background:#FAF9F6"),className:"fp3"},"Tilføj note"),"\n              "),"\n            "),"\n\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isInbox")?F(null,"\n        ",h("div",{style:CS("padding:26px;max-width:940px")},"\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n            ",M(R(S,"inboxItems"),S,"i",(S)=>["\n              ",h("div",{"onClick":R(S,"i.onOpen"),style:CS(("display:flex;gap:13px;padding:14px 16px;border-top:1px solid #E9E6E0;cursor:pointer;background:"+Z(R(S,"i.bg")))),className:"fp7"},"\n                ",h("div",{style:CS(("width:7px;height:7px;border-radius:50%;margin-top:6px;flex:none;background:"+Z(R(S,"i.dot"))))}),"\n                ",h("div",{style:CS("flex:1;min-width:0")},"\n                  ",h("div",{style:CS("display:flex;gap:8px;align-items:center")},"\n                    ",h("div",{style:CS(("font-family:Archivo,sans-serif;font-size:10px;font-weight:700;letter-spacing:.07em;padding:2px 6px;border-radius:3px;color:"+Z(R(S,"i.tagColor"))+";background:"+Z(R(S,"i.tagBg"))+";flex:none"))},V(R(S,"i.tag"))),"\n                    ",h("div",{style:CS(("font-size:13.5px;font-weight:"+Z(R(S,"i.weight"))))},V(R(S,"i.title"))),"\n                  "),"\n                  ",h("div",{style:CS("font-size:12.5px;color:#6E675F;margin-top:4px;line-height:1.45")},V(R(S,"i.body"))),"\n                  ",(R(S,"i.channel")?F(null,"\n                    ",h("div",{style:CS("font-size:11px;color:#9C948B;margin-top:6px")},F(null,"Sendt via ",V(R(S,"i.channel")))),"\n                  "):null),"\n                "),"\n                ",h("div",{style:CS("font-size:11.5px;color:#9C948B;flex:none")},V(R(S,"i.time"))),"\n              "),"\n            "]),"\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isTable")?F(null,"\n        ",h("div",{style:CS("padding:18px 26px 60px 26px")},"\n          ",h("div",{style:CS("display:flex;flex-direction:column;gap:11px;margin-bottom:15px")},"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:8px")},"\n              ",h("div",{style:CS("display:flex;border:1px solid #DFDBD3;border-radius:4px;overflow:hidden")},"\n                ",M(R(S,"scopes"),S,"c",(S)=>["\n                  ",h("div",{"onClick":R(S,"c.onClick"),style:CS(("cursor:pointer;font-size:12.5px;font-weight:600;padding:6px 13px;border-right:1px solid #DFDBD3;color:"+Z(R(S,"c.color"))+";background:"+Z(R(S,"c.bg"))))},F(null,V(R(S,"c.label"))," "),h("span",{style:CS("font-weight:400;opacity:.6;font-variant-numeric:tabular-nums")},V(R(S,"c.count")))),"\n                "]),"\n              "),"\n              ",h("div",{style:CS("flex:1")}),"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-right:2px")},"Gruppér efter"),"\n              ",M(R(S,"groupModes"),S,"g",(S)=>["\n                ",h("div",{"onClick":R(S,"g.onClick"),style:CS(("cursor:pointer;font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:4px;border:1px solid "+Z(R(S,"g.border"))+";color:"+Z(R(S,"g.color"))+";background:"+Z(R(S,"g.bg"))))},V(R(S,"g.label"))),"\n              "]),"\n            "),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-right:2px")},"Status"),"\n              ",M(R(S,"statusChips"),S,"c",(S)=>["\n                ",h("div",{"onClick":R(S,"c.onClick"),style:CS(("cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:4px 10px;border-radius:4px;border:1px solid "+Z(R(S,"c.border"))+";color:"+Z(R(S,"c.color"))+";background:"+Z(R(S,"c.bg"))+";text-decoration:"+Z(R(S,"c.deco"))))},"\n                  ",h("div",{style:CS(("width:7px;height:7px;border-radius:50%;background:"+Z(R(S,"c.dot"))))}),F(null,V(R(S,"c.label")),"\n                  "),h("span",{style:CS("font-variant-numeric:tabular-nums;opacity:.55")},V(R(S,"c.count"))),"\n                "),"\n              "]),"\n              ",h("div",{style:CS("flex:1")}),"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F")},V(R(S,"tableSummary"))),"\n            "),"\n          "),"\n\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n            ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 40px 104px 92px 62px;padding:8px 14px;background:#F7F5F1;border-bottom:1px solid #DFDBD3;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"\n              ",h("div",{},"Opgave"),h("div",{},"Ejer"),h("div",{},"Status"),h("div",{style:CS("text-align:right")},"Deadline"),h("div",{style:CS("text-align:right")},"Tid"),"\n            "),"\n            ",M(R(S,"tableGroups"),S,"g",(S)=>["\n              ",h("div",{},"\n                ",h("div",{"onClick":R(S,"g.onToggle"),style:CS(("display:flex;align-items:center;gap:9px;padding:9px 14px;background:"+Z(R(S,"g.headBg"))+";border-bottom:1px solid #E9E6E0;cursor:pointer")),className:"fpb"},"\n                  ",h("div",{style:CS("font-size:9px;color:#9C948B;width:9px")},V(R(S,"g.caret"))),"\n                  ",h("div",{style:CS(("width:8px;height:8px;border-radius:2px;background:"+Z(R(S,"g.color"))))}),"\n                  ",h("div",{style:CS(("font-family:Archivo,sans-serif;font-size:12.5px;font-weight:600;color:"+Z(R(S,"g.textColor"))))},V(R(S,"g.name"))),"\n                  ",h("div",{style:CS("font-size:11.5px;color:#9C948B")},V(R(S,"g.count"))),"\n                  ",(R(S,"g.warn")?F(null,"\n                    ",h("div",{style:CS("font-size:11px;font-weight:600;color:#9C160D;background:#FBE4D8;border-radius:3px;padding:2px 7px")},V(R(S,"g.warn"))),"\n                  "):null),"\n                  ",h("div",{style:CS("flex:1")}),"\n                  ",h("div",{style:CS("font-size:11.5px;color:#6E675F;font-variant-numeric:tabular-nums")},V(R(S,"g.hours"))),"\n                "),"\n                ",M(R(S,"g.tasks"),S,"t",(S)=>["\n                  ",h("div",{"onClick":R(S,"t.onOpen"),style:CS("display:grid;grid-template-columns:minmax(0,1fr) 40px 104px 92px 62px;padding:8px 14px;border-bottom:1px solid #E9E6E0;cursor:pointer;align-items:center;font-size:12.5px"),className:"fp7"},"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:9px;min-width:0")},"\n                      ",h("div",{"onClick":R(S,"t.onCheck"),"title":"Markér som færdig",style:CS(("width:12px;height:12px;border-radius:3px;border:1.5px solid "+Z(R(S,"t.checkBorder"))+";background:"+Z(R(S,"t.checkFill"))+";flex:none;cursor:pointer"))}),"\n                      ",(R(S,"t.isSub")?F(null,"\n                        ",h("div",{"title":"Underopgave",style:CS("flex:none;color:#9C948B;font-size:13px;line-height:1;font-weight:600")},"↳"),"\n                      "):null),"\n                      ",h("div",{"title":R(S,"t.project"),style:CS(("width:3px;height:17px;border-radius:2px;flex:none;background:"+Z(R(S,"t.projectColor"))))}),"\n                      ",h("div",{style:CS(("overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:"+Z(R(S,"t.titleColor"))))},V(R(S,"t.title"))),"\n                      ",(R(S,"t.prioMark")?F(null,"\n                        ",h("div",{"title":R(S,"t.prioLabel"),style:CS(("flex:none;font-family:Archivo,sans-serif;font-size:14px;font-weight:700;line-height:1;color:"+Z(R(S,"t.prioMarkColor"))))},V(R(S,"t.prioMark"))),"\n                      "):null),"\n                      ",(R(S,"t.recurring")?F(null,"\n                        ",h("div",{"title":R(S,"t.recurring"),style:CS("font-size:11.5px;color:#C9C4BA;flex:none")},"↻"),"\n                      "):null),"\n                      ",(R(S,"t.rollPct")?F(null,"\n                        ",h("div",{style:CS("display:flex;align-items:center;gap:6px;flex:none")},"\n                          ",h("div",{style:CS("width:52px;height:4px;border-radius:2px;background:#E9E6E0;overflow:hidden")},"\n                            ",h("div",{style:CS(("height:4px;width:"+Z(R(S,"t.rollPct"))+";background:#123C2F"))}),"\n                          "),"\n                          ",h("div",{style:CS("font-size:10.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"t.rollLabel"))),"\n                        "),"\n                      "):null),"\n                      ",h("div",{style:CS("display:flex;gap:4px;flex:none;align-items:center")},"\n                        ",M(R(S,"t.labelChips"),S,"l",(S)=>["\n                          ",h("div",{"onClick":R(S,"l.onClick"),style:CS(("cursor:pointer;height:"+Z(R(S,"l.h"))+";min-width:8px;width:"+Z(R(S,"l.w"))+";padding:"+Z(R(S,"l.pad"))+";border-radius:"+Z(R(S,"l.radius"))+";background:"+Z(R(S,"l.color"))+";display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#fff;white-space:nowrap"))},V(R(S,"l.name"))),"\n                        "]),"\n                      "),"\n                    "),"\n                    ",h("div",{"title":R(S,"t.owner"),style:CS(("width:20px;height:20px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:8.5px;font-weight:600;color:#fff;background:"+Z(R(S,"t.ownerColor"))))},V(R(S,"t.ownerInitials"))),"\n                    ",h("div",{},h("span",{style:CS(("font-size:11px;font-weight:600;padding:3px 7px;border-radius:3px;color:"+Z(R(S,"t.statusColor"))+";background:"+Z(R(S,"t.statusBg"))))},V(R(S,"t.statusLabel")))),"\n                    ",h("div",{style:CS(("text-align:right;font-weight:500;color:"+Z(R(S,"t.dueColor"))+";font-variant-numeric:tabular-nums;font-size:12px"))},V(R(S,"t.dueLabel"))),"\n                    ",h("div",{style:CS(("text-align:right;font-variant-numeric:tabular-nums;font-size:11.5px;font-weight:"+Z(R(S,"t.timeWeight"))+";color:"+Z(R(S,"t.timeColor2"))))},V(R(S,"t.tableTime2"))),"\n                  "),"\n                "]),"\n              "),"\n            "]),"\n          "),"\n          ",h("div",{style:CS("margin-top:11px;font-size:11.5px;color:#9C948B")},V(R(S,"archiveNote"))),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isLob")?F(null,"\n        ",h("div",{style:CS("padding:20px 26px 60px 26px")},"\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:5px;background:#fff;overflow:hidden;max-width:860px")},"\n            ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 150px 34px 90px 90px 40px;align-items:center;gap:10px;padding:9px 16px;background:#F7F5F1;border-bottom:1px solid #DFDBD3;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"\n              ",h("div",{},"Løbende arbejde"),h("div",{},"Område"),h("div",{},"Ejer"),h("div",{style:CS("text-align:right")},"Mig, uge"),h("div",{style:CS("text-align:right")},"Team, uge"),h("div",{}),"\n            "),"\n            ",M(R(S,"lobRows"),S,"r",(S)=>["\n              ",h("div",{"onClick":R(S,"r.onOpen"),style:CS("cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) 150px 34px 90px 90px 40px;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid #EFECE6"),className:"fpc"},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:10px;min-width:0")},h("div",{style:CS(("width:3px;height:18px;border-radius:2px;flex:none;background:"+Z(R(S,"r.color"))))}),h("div",{style:CS("font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.title")))),"\n                ",h("div",{style:CS("font-size:12px;color:#6E675F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.area"))),"\n                ",h("div",{style:CS(("width:22px;height:22px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"r.ownerColor"))))},V(R(S,"r.initials"))),"\n                ",h("div",{style:CS(("text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:"+Z(R(S,"r.mineColor"))))},V(R(S,"r.mine"))),"\n                ",h("div",{style:CS("text-align:right;font-size:12px;font-variant-numeric:tabular-nums;color:#6E675F")},V(R(S,"r.team"))),"\n                ",h("div",{"onClick":R(S,"r.onTimer"),style:CS(("justify-self:end;cursor:pointer;width:26px;height:26px;border-radius:50%;box-sizing:border-box;border:1px solid "+Z(R(S,"r.border"))+";background:"+Z(R(S,"r.bg"))+";color:"+Z(R(S,"r.fg"))+";display:flex;align-items:center;justify-content:center;font-size:9px")),className:"fp9"},V(R(S,"r.icon"))),"\n              "),"\n            "]),"\n            ",(R(S,"lobEmpty")?F(null,"\n              ",h("div",{style:CS("padding:16px;font-size:12.5px;color:#9C948B")},"Vælg Type → Løbende arbejde på en opgave for at flytte den hertil."),"\n            "):null),"\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isCal")?F(null,"\n        ",h("div",{style:CS("padding:20px 26px 60px 26px")},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:10px;margin-bottom:14px")},"\n            ",h("div",{"onClick":R(S,"cal.onPrev"),"title":"Forrige",style:CS("cursor:pointer;width:28px;height:28px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#4A443F;font-size:13px"),className:"fpd"},"‹"),"\n            ",h("div",{"onClick":R(S,"cal.onNext"),"title":"Næste",style:CS("cursor:pointer;width:28px;height:28px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#4A443F;font-size:13px"),className:"fpd"},"›"),"\n            ",h("div",{"onClick":R(S,"cal.onToday"),style:CS("cursor:pointer;font-size:12px;font-weight:600;padding:5px 11px;border-radius:4px;border:1px solid #DFDBD3;background:#fff;color:#4A443F"),className:"fp3"},"I dag"),"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:16px;letter-spacing:-0.015em;margin-left:6px")},V(R(S,"cal.title"))),"\n            ",h("div",{style:CS("flex:1")}),"\n            ",h("div",{"onClick":R(S,"cal.onItems"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;color:#0031EB;margin-right:6px")},V(R(S,"cal.itemsLabel"))),"\n            ",h("div",{style:CS("display:flex;border:1px solid #DFDBD3;border-radius:4px;overflow:hidden")},"\n              ",M(R(S,"cal.modes"),S,"o",(S)=>["\n                ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:12px;font-weight:600;padding:5px 12px;background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n              "]),"\n            "),"\n          "),"\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:5px;overflow:hidden;background:#DFDBD3")},"\n            ",(R(S,"cal.showHeads")?F(null,"\n              ",h("div",{style:CS(("display:grid;grid-template-columns:"+Z(R(S,"cal.cols"))+";gap:1px"))},"\n                ",M(R(S,"cal.heads"),S,"h",(S)=>["\n                  ",h("div",{style:CS("background:#F7F5F1;padding:7px 9px;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},V(R(S,"h.label"))),"\n                "]),"\n              "),"\n            "):null),"\n            ",M(R(S,"cal.weeks"),S,"w",(S)=>["\n              ",h("div",{style:CS(("display:grid;grid-template-columns:"+Z(R(S,"cal.cols"))+";gap:1px;margin-top:1px"))},"\n                ",M(R(S,"w.days"),S,"d",(S)=>["\n                  ",h("div",{style:CS(("background:"+Z(R(S,"d.bg"))+";min-height:"+Z(R(S,"d.minH"))+";padding:6px 6px 8px 6px;display:flex;flex-direction:column;gap:3px;min-width:0"))},"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:6px;margin-bottom:2px")},"\n                      ",(R(S,"d.showNum")?F(null,"\n                        ",h("div",{style:CS(("min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:11px;font-weight:600;background:"+Z(R(S,"d.numBg"))+";color:"+Z(R(S,"d.numColor"))+";font-variant-numeric:tabular-nums"))},V(R(S,"d.num"))),"\n                      "):null),"\n                      ",h("div",{style:CS(("font-size:12px;font-weight:600;color:"+Z(R(S,"d.wdColor"))+";padding:2px 2px"))},V(R(S,"d.wd"))),"\n                    "),"\n                    ",M(R(S,"d.tasks"),S,"c",(S)=>["\n                      ",h("div",{"onClick":R(S,"c.onOpen"),"title":R(S,"c.tip"),style:CS(("cursor:pointer;display:flex;align-items:center;gap:6px;border:1px solid #E9E6E0;border-left:3px solid "+Z(R(S,"c.color"))+";border-radius:3px;background:#fff;padding:4px 6px;min-width:0;box-shadow:0 1px 1px rgba(35,31,32,.04)")),className:"fp3"},"\n                        ",h("div",{style:CS(("width:6px;height:6px;border-radius:50%;flex:none;background:"+Z(R(S,"c.statusDot")))),"title":R(S,"c.statusLabel")}),"\n                        ",h("div",{style:CS(("flex:1;min-width:0;font-size:11.5px;font-weight:500;color:"+Z(R(S,"c.textColor"))+";text-decoration:"+Z(R(S,"c.deco"))+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap"))},V(R(S,"c.title"))),"\n                        ",(R(S,"c.prio")?F(null,h("div",{style:CS("font-size:11px;font-weight:700;color:#9C160D;flex:none")},"!")):null),"\n                        ",h("div",{style:CS(("width:16px;height:16px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:7.5px;font-weight:600;color:#fff;background:"+Z(R(S,"c.ownerColor"))))},V(R(S,"c.initials"))),"\n                      "),"\n                    "]),"\n                    ",M(R(S,"d.items"),S,"i",(S)=>["\n                      ",h("div",{"onClick":R(S,"i.onOpen"),"title":R(S,"i.tip"),style:CS("cursor:pointer;display:flex;align-items:center;gap:6px;padding:2px 6px 2px 8px;min-width:0;border-radius:3px"),className:"fpe"},"\n                        ",h("div",{"onClick":R(S,"i.onCheck"),"title":"Markér som færdig",style:CS("width:10px;height:10px;border-radius:2px;flex:none;border:1.5px solid #C9C4BA;box-sizing:border-box"),className:"fp9"}),"\n                        ",h("div",{style:CS("flex:1;min-width:0;font-size:10.5px;color:#9C948B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"i.text"))),"\n                      "),"\n                    "]),"\n                    ",(R(S,"d.more")?F(null,"\n                      ",h("div",{"onClick":R(S,"d.onMore"),style:CS("cursor:pointer;font-size:10.5px;font-weight:600;color:#0031EB;padding:1px 6px")},V(R(S,"d.more"))),"\n                    "):null),"\n                  "),"\n                "]),"\n              "),"\n            "]),"\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isBoard")?F(null,"\n        ",h("div",{style:CS("padding:20px 26px 60px 26px;background:#EFECE6;min-height:100%")},"\n          ",M(R(S,"lanes"),S,"l",(S)=>["\n            ",h("div",{style:CS("margin-bottom:22px;border:1px solid #DFDBD3;border-radius:5px;background:#fff;overflow:hidden")},"\n              ",h("div",{style:CS(("display:flex;align-items:center;gap:11px;padding:11px 14px;background:"+Z(R(S,"l.tint"))+";border-bottom:1px solid #DFDBD3"))},"\n                ",h("div",{style:CS(("width:26px;height:26px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:10px;font-weight:600;color:#fff;background:"+Z(R(S,"l.color"))))},V(R(S,"l.initials"))),"\n                ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:14px;letter-spacing:-0.01em")},V(R(S,"l.name"))),"\n                ",h("div",{style:CS("font-size:11.5px;color:#4A443F")},V(R(S,"l.load"))),"\n                ",h("div",{style:CS("flex:1")}),"\n                ",h("div",{style:CS("display:flex;width:168px;height:6px;border-radius:3px;overflow:hidden;background:#E4E0D8")},"\n                  ",M(R(S,"l.mix"),S,"m",(S)=>["\n                    ",h("div",{style:CS(("width:"+Z(R(S,"m.w"))+";background:"+Z(R(S,"m.color"))))}),"\n                  "]),"\n                "),"\n              "),"\n              ",h("div",{style:CS("display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;background:#E9E6E0")},"\n                ",M(R(S,"l.columns"),S,"c",(S)=>["\n                  ",h("div",{style:CS("background:#fff;padding:0 0 10px 0;min-height:92px")},"\n                    ",h("div",{style:CS(("display:flex;align-items:center;gap:6px;padding:7px 10px;background:"+Z(R(S,"c.headBg"))+";border-bottom:1px solid #E9E6E0"))},"\n                      ",h("div",{style:CS(("width:6px;height:6px;border-radius:50%;background:"+Z(R(S,"c.color"))+";flex:none"))}),"\n                      ",h("div",{style:CS(("font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:"+Z(R(S,"c.headColor"))+";flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"))},V(R(S,"c.title"))),"\n                      ",h("div",{style:CS(("font-size:11px;font-weight:600;color:"+Z(R(S,"c.headColor"))+";font-variant-numeric:tabular-nums"))},V(R(S,"c.count"))),"\n                    "),"\n                    ",h("div",{style:CS("display:flex;flex-direction:column;gap:7px;padding:9px 9px 0 9px")},"\n                      ",(R(S,"c.empty")?F(null,"\n                        ",h("div",{style:CS("border:1px dashed #E4E0D8;border-radius:3px;height:34px")}),"\n                      "):null),"\n                      ",M(R(S,"c.tasks"),S,"t",(S)=>["\n                        ",h("div",{"onClick":R(S,"t.onOpen"),style:CS(("background:"+Z(R(S,"t.tint"))+";border:1px solid #DFDBD3;border-left:3px solid "+Z(R(S,"t.projectColor"))+";border-radius:3px;padding:9px 10px;cursor:pointer;box-shadow:0 1px 2px rgba(16,16,20,.04)")),className:"fpf"},"\n                          ",(R(S,"t.dots")?F(null,"\n                            ",h("div",{style:CS("display:flex;gap:3px;margin-bottom:6px")},"\n                              ",M(R(S,"t.dots"),S,"d",(S)=>["\n                                ",h("div",{style:CS(("width:14px;height:4px;border-radius:2px;background:"+Z(R(S,"d.color"))))}),"\n                              "]),"\n                            "),"\n                          "):null),"\n                          ",h("div",{style:CS(("font-size:12px;line-height:1.35;font-weight:500;color:"+Z(R(S,"t.titleColor"))))},V(R(S,"t.title"))),"\n                          ",(R(S,"t.prog")?F(null,"\n                            ",h("div",{style:CS("height:3px;border-radius:2px;background:#E9E6E0;margin-top:7px;overflow:hidden")},"\n                              ",h("div",{style:CS(("height:3px;width:"+Z(R(S,"t.prog"))+";background:"+Z(R(S,"t.progColor"))))}),"\n                            "),"\n                          "):null),"\n                          ",h("div",{style:CS("display:flex;align-items:center;gap:6px;margin-top:7px")},"\n                            ",(R(S,"t.prioMark")?F(null,"\n                              ",h("div",{"title":R(S,"t.prioLabel"),style:CS(("font-family:Archivo,sans-serif;font-size:13px;font-weight:700;line-height:1;color:"+Z(R(S,"t.prioMarkColor"))))},V(R(S,"t.prioMark"))),"\n                            "):null),"\n                            ",h("div",{style:CS("flex:1")}),"\n                            ",h("div",{style:CS(("font-size:10.5px;color:"+Z(R(S,"t.dueColor"))+";font-weight:500;font-variant-numeric:tabular-nums"))},V(R(S,"t.dueShort"))),"\n                          "),"\n                          ",(R(S,"t.blockedLabel")?F(null,"\n                            ",h("div",{style:CS("margin-top:7px;font-size:10.5px;color:#9C160D;background:#FDEFE6;border-radius:2px;padding:3px 6px")},V(R(S,"t.blockedLabel"))),"\n                          "):null),"\n                        "),"\n                      "]),"\n                    "),"\n                  "),"\n                "]),"\n              "),"\n            "),"\n          "]),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isGantt")?F(null,"\n        ",h("div",{style:CS("padding:22px 26px 60px 26px")},"\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n            ",h("div",{style:CS("display:flex;border-bottom:1px solid #DFDBD3;background:#F7F5F1")},"\n              ",h("div",{style:CS("width:300px;flex:none;padding:9px 14px;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;border-right:1px solid #DFDBD3")},"Opgave"),"\n              ",h("div",{style:CS("flex:1;display:flex")},"\n                ",M(R(S,"ganttWeeks"),S,"w",(S)=>["\n                  ",h("div",{style:CS(("flex:1;padding:9px 0 9px 7px;font-size:10.5px;color:#6E675F;border-right:1px solid #EFEFF2;font-weight:"+Z(R(S,"w.weight"))))},V(R(S,"w.label"))),"\n                "]),"\n              "),"\n            "),"\n            ",h("div",{style:CS("display:flex")},"\n              ",h("div",{style:CS("width:300px;flex:none;border-right:1px solid #DFDBD3")},"\n                ",M(R(S,"ganttRows"),S,"r",(S)=>["\n                  ",h("div",{"onClick":R(S,"r.onOpen"),style:CS(("height:32px;display:flex;align-items:center;gap:9px;padding:0 14px 0 "+Z(R(S,"r.pad"))+";border-bottom:1px solid #E9E6E0;font-size:"+Z(R(S,"r.size"))+";font-weight:"+Z(R(S,"r.weight"))+";font-family:"+Z(R(S,"r.font"))+";cursor:"+Z(R(S,"r.cursor"))+";background:"+Z(R(S,"r.rowBg"))+";color:"+Z(R(S,"r.textColor"))))},"\n                    ",(R(S,"r.dotColor")?F(null,h("div",{style:CS(("width:7px;height:7px;border-radius:2px;flex:none;background:"+Z(R(S,"r.dotColor"))))})):null),"\n                    ",h("div",{style:CS("flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.label"))),"\n                  "),"\n                "]),"\n              "),"\n              ",h("div",{style:CS("flex:1;position:relative;overflow:hidden")},"\n                ",M(R(S,"ganttRows"),S,"r",(S)=>["\n                  ",h("div",{style:CS(("height:32px;border-bottom:1px solid #E9E6E0;background:"+Z(R(S,"r.rowBg"))))}),"\n                "]),"\n                ",M(R(S,"ganttGrid"),S,"g",(S)=>["\n                  ",h("div",{style:CS(("position:absolute;top:0;bottom:0;width:1px;background:#EFEFF2;left:"+Z(R(S,"g.left"))))}),"\n                "]),"\n                ",h("div",{style:CS(("position:absolute;top:0;bottom:0;width:2px;background:#9C160D;left:"+Z(R(S,"ganttToday"))))}),"\n                ",M(R(S,"ganttLinks"),S,"k",(S)=>["\n                  ",h("div",{style:CS(("position:absolute;background:#6E9BD6;left:"+Z(R(S,"k.left"))+";top:"+Z(R(S,"k.top"))+";width:"+Z(R(S,"k.w"))+";height:"+Z(R(S,"k.h"))))}),"\n                "]),"\n                ",M(R(S,"ganttBars"),S,"b",(S)=>["\n                  ",h("div",{"onClick":R(S,"b.onOpen"),style:CS(("position:absolute;height:17px;border-radius:3px;cursor:pointer;display:flex;align-items:center;padding:0 6px;overflow:hidden;left:"+Z(R(S,"b.left"))+";top:"+Z(R(S,"b.top"))+";width:"+Z(R(S,"b.width"))+";background:"+Z(R(S,"b.bg"))+";border:1px solid "+Z(R(S,"b.border"))))},"\n                    ",h("div",{style:CS(("font-size:10px;font-weight:600;white-space:nowrap;color:"+Z(R(S,"b.text"))))},V(R(S,"b.label"))),"\n                  "),"\n                "]),"\n              "),"\n            "),"\n          "),"\n          ",h("div",{style:CS("display:flex;gap:18px;margin-top:12px;font-size:11.5px;color:#6E675F;align-items:center;flex-wrap:wrap")},"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:18px;height:9px;border-radius:2px;background:#0031EB")}),"I gang"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:18px;height:9px;border-radius:2px;background:#DCE6F6;border:1px solid #9FC4DB")}),"Pipeline"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:18px;height:9px;border-radius:2px;background:#F4C7AC")}),"P-plads"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:18px;height:9px;border-radius:2px;background:#CDE8DA")}),"Færdig"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:2px;height:12px;background:#9C160D")}),"I dag"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},h("div",{style:CS("width:14px;height:1px;background:#6E9BD6")}),"Afhængighed"),"\n            ",h("div",{style:CS("color:#9C948B")},"Idéer uden dato vises ikke på tidslinjen"),"\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isTime")?F(null,"\n        ",h("div",{style:CS("padding:22px 26px 60px 26px;display:flex;flex-direction:column;gap:22px")},"\n          ",h("div",{style:CS("display:flex;gap:8px;align-items:center")},"\n            ",M(R(S,"timeScopes"),S,"s",(S)=>["\n              ",h("div",{"onClick":R(S,"s.onClick"),style:CS(("cursor:pointer;font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:4px;border:1px solid "+Z(R(S,"s.border"))+";color:"+Z(R(S,"s.color"))+";background:"+Z(R(S,"s.bg"))))},V(R(S,"s.label"))),"\n            "]),"\n            ",h("div",{style:CS("flex:1")}),"\n            ",h("div",{style:CS("font-size:12.5px;color:#6E675F")},V(R(S,"weekLabel"))),"\n          "),"\n\n          ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n            ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) repeat(5,84px) 90px;padding:9px 14px;background:#F7F5F1;border-bottom:1px solid #DFDBD3;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"\n              ",h("div",{},"Opgave"),"\n              ",M(R(S,"weekCols"),S,"c",(S)=>[h("div",{style:CS(("text-align:right;color:"+Z(R(S,"c.color"))))},V(R(S,"c.label")))]),"\n              ",h("div",{style:CS("text-align:right")},"I alt"),"\n            "),"\n            ",M(R(S,"timeRows"),S,"r",(S)=>["\n              ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) repeat(5,84px) 90px;padding:9px 14px;border-bottom:1px solid #E9E6E0;font-size:12.5px;align-items:center")},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px;min-width:0")},"\n                  ",h("div",{style:CS(("width:3px;height:20px;border-radius:2px;background:"+Z(R(S,"r.projectColor"))+";flex:none"))}),"\n                  ",h("div",{style:CS("overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500")},V(R(S,"r.title"))),"\n                  ",(R(S,"r.owner")?F(null,h("div",{style:CS("font-size:11px;color:#9C948B;flex:none")},V(R(S,"r.owner")))):null),"\n                "),"\n                ",M(R(S,"r.cells"),S,"c",(S)=>["\n                  ",h("div",{style:CS(("text-align:right;font-variant-numeric:tabular-nums;color:"+Z(R(S,"c.color"))))},V(R(S,"c.v"))),"\n                "]),"\n                ",h("div",{style:CS("text-align:right;font-variant-numeric:tabular-nums;font-weight:600")},V(R(S,"r.total"))),"\n              "),"\n            "]),"\n            ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) repeat(5,84px) 90px;padding:11px 14px;background:#F7F5F1;font-size:12.5px;font-weight:600;font-family:Archivo,sans-serif")},"\n              ",h("div",{},"I alt"),"\n              ",M(R(S,"timeTotals"),S,"c",(S)=>[h("div",{style:CS("text-align:right;font-variant-numeric:tabular-nums")},V(R(S,"c.v")))]),"\n              ",h("div",{style:CS("text-align:right;font-variant-numeric:tabular-nums;color:#0031EB")},V(R(S,"timeGrand"))),"\n            "),"\n          "),"\n\n          ",h("div",{},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;margin-bottom:10px")},"Estimat mod faktisk forbrug"),"\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;overflow:hidden")},"\n              ",M(R(S,"varianceRows"),S,"v",(S)=>["\n                ",h("div",{"onClick":R(S,"v.onOpen"),style:CS("display:flex;align-items:center;gap:14px;padding:11px 14px;border-bottom:1px solid #E9E6E0;cursor:pointer"),className:"fp7"},"\n                  ",h("div",{style:CS("width:250px;flex:none;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"v.title"))),"\n                  ",h("div",{style:CS("flex:1;position:relative;height:18px")},"\n                    ",h("div",{style:CS(("position:absolute;left:0;top:3px;height:12px;background:#E4E0D8;border-radius:2px;width:"+Z(R(S,"v.estPct"))))}),"\n                    ",h("div",{style:CS(("position:absolute;left:0;top:6px;height:6px;border-radius:2px;background:"+Z(R(S,"v.color"))+";width:"+Z(R(S,"v.actPct"))))}),"\n                  "),"\n                  ",h("div",{style:CS("width:150px;text-align:right;font-size:11.5px;color:#6E675F;font-variant-numeric:tabular-nums")},V(R(S,"v.numbers"))),"\n                  ",h("div",{style:CS(("width:70px;text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:"+Z(R(S,"v.color"))))},V(R(S,"v.delta"))),"\n                "),"\n              "]),"\n            "),"\n          "),"\n        "),"\n      "):null),"\n\n      ",(R(S,"isDash")?F(null,"\n        ",h("div",{style:CS("padding:22px 26px 60px 26px;display:flex;flex-direction:column;gap:20px")},"\n          ",h("div",{style:CS("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px")},"\n            ",M(R(S,"kpis"),S,"k",(S)=>["\n              ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:15px")},"\n                ",h("div",{style:CS("font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},V(R(S,"k.label"))),"\n                ",h("div",{style:CS(("font-family:Archivo,sans-serif;font-size:28px;font-weight:600;letter-spacing:-0.03em;margin-top:7px;font-variant-numeric:tabular-nums;color:"+Z(R(S,"k.color"))))},V(R(S,"k.value"))),"\n                ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:3px")},V(R(S,"k.sub"))),"\n              "),"\n            "]),"\n          "),"\n\n          ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px")},"\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:17px")},"\n              ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;margin-bottom:3px")},"Kapacitet denne uge"),"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:15px")},"Resterende estimat på igangværende og forfaldne opgaver, mod 37 timers uge"),"\n              ",M(R(S,"capacity"),S,"c",(S)=>["\n                ",h("div",{style:CS("margin-bottom:14px")},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:6px")},"\n                    ",h("div",{style:CS(("width:20px;height:20px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"c.color"))))},V(R(S,"c.initials"))),"\n                    ",h("div",{style:CS("font-size:12.5px;font-weight:500;flex:1")},V(R(S,"c.name"))),"\n                    ",h("div",{style:CS(("font-size:12px;font-variant-numeric:tabular-nums;font-weight:600;color:"+Z(R(S,"c.statusColor"))))},V(R(S,"c.label"))),"\n                  "),"\n                  ",h("div",{style:CS("height:9px;background:#E9E6E0;border-radius:2px;position:relative;overflow:hidden")},"\n                    ",h("div",{style:CS(("position:absolute;left:0;top:0;bottom:0;background:"+Z(R(S,"c.statusColor"))+";width:"+Z(R(S,"c.pct"))))}),"\n                  "),"\n                "),"\n              "]),"\n            "),"\n\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:17px")},"\n              ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;margin-bottom:3px")},"Tid pr. område"),"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:15px")},"Registreret de seneste 30 dage"),"\n              ",M(R(S,"projectTime"),S,"p",(S)=>["\n                ",h("div",{style:CS("display:flex;align-items:center;gap:11px;margin-bottom:10px")},"\n                  ",h("div",{style:CS("width:138px;flex:none;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"p.name"))),"\n                  ",h("div",{style:CS("flex:1;height:11px;background:#E9E6E0;border-radius:2px;overflow:hidden")},"\n                    ",h("div",{style:CS(("height:100%;background:"+Z(R(S,"p.color"))+";width:"+Z(R(S,"p.pct"))))}),"\n                  "),"\n                  ",h("div",{style:CS("width:46px;text-align:right;font-size:11.5px;color:#6E675F;font-variant-numeric:tabular-nums")},V(R(S,"p.hours"))),"\n                "),"\n              "]),"\n            "),"\n          "),"\n\n          ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px")},"\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:17px")},"\n              ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;margin-bottom:15px")},"Kræver opmærksomhed"),"\n              ",M(R(S,"riskRows"),S,"r",(S)=>["\n                ",h("div",{"onClick":R(S,"r.onOpen"),style:CS("display:flex;gap:11px;align-items:center;padding:9px 0;border-top:1px solid #E9E6E0;cursor:pointer")},"\n                  ",h("div",{style:CS(("width:4px;height:26px;border-radius:2px;flex:none;background:"+Z(R(S,"r.color"))))}),"\n                  ",h("div",{style:CS("flex:1;min-width:0")},"\n                    ",h("div",{style:CS("font-size:12.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.title"))),"\n                    ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:2px")},V(R(S,"r.reason"))),"\n                  "),"\n                  ",h("div",{style:CS("font-size:11.5px;color:#6E675F;flex:none")},V(R(S,"r.owner"))),"\n                "),"\n              "]),"\n            "),"\n            ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:17px")},"\n              ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:13px;margin-bottom:15px")},"Opgaver pr. status"),"\n              ",h("div",{style:CS("display:flex;height:13px;border-radius:2px;overflow:hidden;margin-bottom:16px")},"\n                ",M(R(S,"statusDist"),S,"s",(S)=>["\n                  ",h("div",{style:CS(("background:"+Z(R(S,"s.color"))+";width:"+Z(R(S,"s.pct"))))}),"\n                "]),"\n              "),"\n              ",M(R(S,"statusDist"),S,"s",(S)=>["\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid #E9E6E0")},"\n                  ",h("div",{style:CS(("width:8px;height:8px;border-radius:2px;background:"+Z(R(S,"s.color"))))}),"\n                  ",h("div",{style:CS("flex:1;font-size:12.5px")},V(R(S,"s.label"))),"\n                  ",h("div",{style:CS("font-size:12.5px;font-variant-numeric:tabular-nums;font-weight:600")},V(R(S,"s.count"))),"\n                  ",h("div",{style:CS("width:44px;text-align:right;font-size:11.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"s.pctLabel"))),"\n                "),"\n              "]),"\n            "),"\n          "),"\n        "),"\n      "):null),"\n\n    ")),"\n  "),"\n\n  ",(R(S,"d")?F(null,"\n    ",h("div",{"data-bd":"1","onClick":R(S,"d.onClose"),style:CS("position:fixed;inset:0;z-index:80;background:rgba(35,31,32,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:hidden")},"\n    ",h("div",{"onClick":R(S,"stopClick"),"onPaste":R(S,"d.onPaste"),style:CS("width:900px;max-width:100%;max-height:calc(100vh - 80px);border:1px solid #DFDBD3;border-radius:6px;background:#fff;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 60px rgba(35,31,32,.28)")},"\n      ",h("div",{style:CS("flex:none;padding:16px 20px;border-bottom:1px solid #DFDBD3;display:flex;align-items:flex-start;gap:12px")},"\n        ",(R(S,"d.backShow")?F(null,"\n          ",h("div",{"onClick":R(S,"d.onBack"),"title":R(S,"d.backTitle"),style:CS("cursor:pointer;flex:none;width:26px;height:26px;border-radius:4px;border:1px solid #DFDBD3;display:flex;align-items:center;justify-content:center;font-size:13px;color:#4A443F;background:#fff;margin-top:2px"),className:"fpg"},"←"),"\n        "):null),"\n        ",h("div",{style:CS("flex:1;min-width:0")},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:7px;font-size:11.5px;color:#6E675F;margin-bottom:5px")},"\n            ",h("div",{style:CS(("width:7px;height:7px;border-radius:2px;background:"+Z(R(S,"d.projectColor"))))}),"\n            ",(R(S,"d.parentName")?F(null,"\n              ",h("div",{"onClick":R(S,"d.onParent"),style:CS("cursor:pointer;font-size:11.5px;color:#0031EB;font-weight:600"),className:"fph"},F(null,"↰ ",V(R(S,"d.parentName")))),"\n            "):null),"\n            ",h("div",{style:CS("font-size:11.5px;color:#6E675F;padding:1px 0")},V(R(S,"d.projectName"))),"\n          "),"\n          ",h("input",{"value":DV(R(S,"d.title")),"onChange":R(S,"d.onTitle"),style:CS("width:100%;border:1px solid transparent;border-radius:3px;padding:2px 5px;margin-left:-5px;font-family:Archivo,sans-serif;font-weight:600;font-size:17px;line-height:1.3;letter-spacing:-0.015em;color:#231F20;background:transparent;outline:none"),className:"fp7 fpi"}),"\n        "),"\n        ",h("div",{"onClick":R(S,"d.onClose"),style:CS("cursor:pointer;color:#9C948B;font-size:17px;line-height:1;padding:2px 4px")},"✕"),"\n      "),"\n\n      ",h("div",{style:CS("flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:minmax(0,1fr) 310px;align-items:start")},"\n        ",h("div",{style:CS("padding:18px 20px 34px 20px;display:flex;flex-direction:column;gap:20px;border-right:1px solid #E9E6E0")},"\n\n        ",(R(S,"d.blocked")?F(null,"\n          ",h("div",{style:CS("border:1px solid #F4C7AC;background:#FDEFE6;border-radius:4px;padding:11px 13px;font-size:12.5px;color:#9C160D;line-height:1.45")},V(R(S,"d.blocked"))),"\n        "):null),"\n\n        ",h("textarea",{"value":DV(R(S,"d.descValue")),"onChange":R(S,"d.onDesc"),"rows":R(S,"d.descRows"),"placeholder":"Skriv hvad opgaven går ud på",style:CS("width:100%;border:1px solid transparent;border-left:3px solid #0031EB;border-radius:0 3px 3px 0;padding:6px 10px;font-family:inherit;font-size:14px;font-weight:600;line-height:1.5;color:#231F20;background:#F7F5F1;outline:none;resize:vertical;text-wrap:pretty"),className:"fpi"}),"\n\n        ",h("div",{},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:4px")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:12.5px")},"Checkliste"),"\n            ",(R(S,"d.checkProgress")?F(null,"\n              ",h("div",{style:CS("font-size:11.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"d.checkProgress"))),"\n            "):null),"\n            ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n            ",(R(S,"d.hasDoneItems")?F(null,"\n              ",h("div",{"onClick":R(S,"d.onToggleDone"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;color:#0031EB")},V(R(S,"d.doneToggleLabel"))),"\n            "):null),"\n            ",h("div",{"onClick":R(S,"d.onSaveTemplate"),"title":"Gem som skabelon",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"8","y":"8","width":"12","height":"12","rx":"2"}),h("path",{"d":"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"}))),"\n            ",(R(S,"d.hasItems")?F(null,"\n              ",h("div",{"onClick":R(S,"d.onClearAsk"),"title":"Slet hele listen",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpk"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M4 7h16"}),h("path",{"d":"M10 11v6"}),h("path",{"d":"M14 11v6"}),h("path",{"d":"M6 7l1 13h10l1-13"}),h("path",{"d":"M9 7V4h6v3"}))),"\n            "):null),"\n          "),"\n          ",(R(S,"d.clearAsk")?F(null,"\n            ",h("div",{style:CS("margin-top:8px;border:1px solid #F4C7AC;background:#FDEFE6;border-radius:3px;padding:9px 11px;display:flex;align-items:center;gap:8px")},"\n              ",h("div",{style:CS("flex:1;font-size:11.5px;color:#9C160D")},F(null,"Slet alle ",V(R(S,"d.itemCount"))," punkter?")),"\n              ",h("div",{"onClick":R(S,"d.onClearYes"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;background:#9C160D;color:#fff")},"Slet"),"\n              ",h("div",{"onClick":R(S,"d.onClearNo"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D")},"Annuller"),"\n            "),"\n          "):null),"\n          ",h("div",{style:CS("display:flex;flex-direction:column;gap:1px;margin-top:6px")},"\n            ",M(R(S,"d.checklist"),S,"c",(S)=>["\n              ",h("div",{},"\n                ",h("div",{"onClick":R(S,"c.onToggle"),style:CS(("display:flex;align-items:center;gap:10px;padding:6px 8px;padding-left:"+Z(R(S,"c.indent"))+";border-radius:3px;cursor:pointer")),className:"fp7"},"\n                  ",(R(S,"c.hasDep")?F(null,"\n                    ",h("div",{"title":R(S,"c.depNote"),style:CS("flex:none;margin-left:-10px;width:14px;display:flex;align-items:center;justify-content:center;color:#9C948B")},"\n                      ",h("svg",{"width":"12","height":"12","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M6 4v9a3 3 0 0 0 3 3h9"}),h("path",{"d":"M15 12l4 4-4 4"})),"\n                    "),"\n                  "):null),"\n                  ",h("div",{style:CS(("width:14px;height:14px;border-radius:3px;flex:none;border:1.5px solid "+Z(R(S,"c.border"))+";background:"+Z(R(S,"c.fill"))+";color:#fff;font-size:9.5px;display:flex;align-items:center;justify-content:center;line-height:1"))},V(R(S,"c.mark"))),"\n                  ",h("div",{style:CS("flex:1;min-width:0")},"\n                    ",h("input",{"value":DV(R(S,"c.value")),"onChange":R(S,"c.onText"),"onClick":R(S,"stopClick"),style:CS(("width:100%;border:1px solid transparent;border-radius:3px;padding:2px 5px;margin-left:-5px;font-size:12.5px;font-family:inherit;line-height:1.4;color:"+Z(R(S,"c.color"))+";text-decoration:"+Z(R(S,"c.deco"))+";background:transparent;outline:none")),className:"fpl fpi"}),"\n                  "),"\n                  ",h("div",{"onClick":R(S,"c.onPromote"),"title":"Gør til selvstændig opgave",style:CS("cursor:pointer;flex:none;width:24px;height:24px;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpj"},"\n                    ",h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M7 17 17 7"}),h("path",{"d":"M9 7h8v8"})),"\n                  "),"\n                  ",h("div",{"onClick":R(S,"c.onChain"),"title":R(S,"c.depNote"),style:CS(("cursor:pointer;flex:none;width:24px;height:24px;border:1px solid "+Z(R(S,"c.chainBorder"))+";border-radius:4px;background:"+Z(R(S,"c.chainBg"))+";display:flex;align-items:center;justify-content:center;color:"+Z(R(S,"c.chainColor")))),className:"fpd"},"\n                    ",h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round"},h("path",{"d":"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"}),h("path",{"d":"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"})),"\n                  "),"\n                  ",h("div",{"onClick":R(S,"stopClick"),"title":"Skift ansvarlig",style:CS(("position:relative;width:24px;height:24px;border-radius:4px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"c.ownerColor"))+";cursor:pointer"))},F(null,V(R(S,"c.ownerInitials")),"\n                  "),h("select",{"value":DV(R(S,"c.byValue")),"onChange":R(S,"c.onBy"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},M(R(S,"d.peopleOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))]))),"\n                  ",(R(S,"c.dateShow")?F(null,"\n                    ",h(window.FlowDate,{"value":DV(R(S,"c.dueValue")),"onChange":R(S,"c.onDue"),"onClick":R(S,"stopClick"),style:CS(("width:118px;flex:none;border:1px solid transparent;border-radius:3px;padding:2px 4px;font-size:11px;font-family:inherit;color:"+Z(R(S,"c.dueColor"))+";background:transparent;outline:none")),className:"fpl fpi"}),"\n                  "):null),"\n                  ",(R(S,"c.dateEmpty")?F(null,"\n                    ",h("div",{"onClick":R(S,"c.onDateOpen"),"title":"Vælg dato",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"4","y":"5","width":"16","height":"15","rx":"2"}),h("path",{"d":"M4 10h16"}),h("path",{"d":"M9 3v4"}),h("path",{"d":"M15 3v4"}))),"\n                  "):null),"\n                  ",h("div",{"onClick":R(S,"c.onDelete"),"title":"Slet punkt",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpk"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M4 7h16"}),h("path",{"d":"M10 11v6"}),h("path",{"d":"M14 11v6"}),h("path",{"d":"M6 7l1 13h10l1-13"}),h("path",{"d":"M9 7V4h6v3"}))),"\n                "),"\n                ",(R(S,"c.depRowOpen")?F(null,"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:7px;margin:2px 0 6px 46px")},"\n                    ",h("div",{style:CS("font-size:11px;color:#9C948B;flex:none")},"Afhængig af"),"\n                    ",h("select",{"value":DV(R(S,"c.afterValue")),"onChange":R(S,"c.onAfterChange"),style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:3px;padding:4px 7px;font-size:11.5px;font-family:inherit;color:#4A443F;background:#fff;outline:none"),className:"fpm"},M(R(S,"c.afterOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                  "),"\n                "):null),"\n                ",(R(S,"c.warnOn")?F(null,"\n                  ",h("div",{style:CS("margin:2px 0 6px 24px;border:1px solid #F4C7AC;background:#FDEFE6;border-radius:3px;padding:9px 11px")},"\n                    ",h("div",{style:CS("font-size:11.5px;color:#9C160D;line-height:1.45")},V(R(S,"c.warnText"))),"\n                    ",h("div",{style:CS("display:flex;gap:7px;margin-top:8px")},"\n                      ",h("div",{"onClick":R(S,"c.onConfirm"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;background:#9C160D;color:#fff")},"Markér som færdig"),"\n                      ",h("div",{"onClick":R(S,"c.onCancelWarn"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D")},"Fortryd"),"\n                    "),"\n                  "),"\n                "):null),"\n              "),"\n            "]),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:10px;padding:6px 8px")},"\n              ",h("div",{style:CS("width:14px;height:14px;border:1.5px dashed #C9C4BA;border-radius:3px;flex:none")}),"\n              ",h("input",{"onKeyDown":R(S,"d.newItemKey"),"placeholder":"Tilføj",style:CS("flex:1;border:1px solid transparent;border-radius:3px;padding:3px 5px;font-size:12.5px;font-family:inherit;color:#231F20;background:transparent;outline:none"),className:"fpl fpi"}),"\n            "),"\n          "),"\n        "),"\n\n        ",h("div",{"onDrop":R(S,"d.onDropFiles"),"onDragOver":R(S,"d.onDragOver")},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:10px")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:12.5px")},"Filer"),"\n            ",(R(S,"d.fileCount")?F(null,"\n              ",h("div",{style:CS("font-size:11.5px;color:#9C948B")},V(R(S,"d.fileCount"))),"\n            "):null),"\n            ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n          "),"\n          ",h("div",{style:CS("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px")},"\n            ",M(R(S,"d.files"),S,"f",(S)=>["\n              ",h("div",{"onClick":R(S,"f.onOpen"),style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:9px;display:flex;flex-direction:column;gap:7px;cursor:pointer;position:relative"),className:"fp3"},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                  ",h("div",{style:CS(("width:30px;height:30px;border-radius:3px;flex:none;background:"+Z(R(S,"f.tileBg"))+";color:"+Z(R(S,"f.tileColor"))+";display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:700"))},V(R(S,"f.tileLabel"))),"\n                  ",h("div",{"onClick":R(S,"f.onDelete"),style:CS("margin-left:auto;cursor:pointer;color:#C9C4BA;font-size:12px"),className:"fp4"},"✕"),"\n                "),"\n                ",h("div",{style:CS("font-size:12px;font-weight:600;color:#231F20;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"f.name"))),"\n                ",h("div",{style:CS("font-size:10.5px;color:#9C948B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"f.sub"))),"\n              "),"\n            "]),"\n            ",h("div",{"onClick":R(S,"d.onAttach"),style:CS("border:1px dashed #C9C4BA;border-radius:4px;min-height:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:#9C948B"),className:"fpd"},"\n              ",h("div",{style:CS("font-size:19px;line-height:1")},"+"),"\n              ",h("div",{style:CS("font-size:11px;font-weight:600")},"Tilføj"),"\n            "),"\n          "),"\n        "),"\n\n        ",(R(S,"d.hasSubtasks")?F(null,"\n          ",h("div",{},"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:10px")},"\n              ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:12.5px")},"Underopgaver"),"\n              ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n            "),"\n            ",h("div",{style:CS("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px")},"\n              ",M(R(S,"d.subtasks"),S,"k",(S)=>["\n                ",h("div",{"onClick":R(S,"k.onOpen"),style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:9px 10px;cursor:pointer;display:flex;flex-direction:column;gap:6px"),className:"fp3"},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},"\n                    ",h("div",{style:CS(("width:3px;height:14px;border-radius:2px;flex:none;background:"+Z(R(S,"k.color"))))}),"\n                    ",h("div",{style:CS("font-size:12.5px;font-weight:500;color:#231F20;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"k.title"))),"\n                  "),"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                    ",h("div",{style:CS(("font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:3px;color:"+Z(R(S,"k.statusColor"))+";background:"+Z(R(S,"k.statusBg"))))},V(R(S,"k.statusLabel"))),"\n                    ",h("div",{style:CS("font-size:10.5px;color:#9C948B")},V(R(S,"k.owner"))),"\n                    ",h("div",{style:CS("flex:1")}),"\n                    ",h("div",{style:CS("font-size:10.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"k.due"))),"\n                  "),"\n                "),"\n              "]),"\n            "),"\n          "),"\n        "):null),"\n\n        ",h("div",{},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:10px")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:12.5px")},"Afhængigheder"),"\n            ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n          "),"\n          ",h("div",{style:CS("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px")},"\n            ",M(R(S,"d.deps"),S,"k",(S)=>["\n              ",h("div",{"onClick":R(S,"k.onOpen"),style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:9px 10px;cursor:pointer;display:flex;flex-direction:column;gap:6px"),className:"fp3"},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},"\n                  ",h("div",{style:CS(("width:3px;height:14px;border-radius:2px;flex:none;background:"+Z(R(S,"k.color"))))}),"\n                  ",h("div",{style:CS("font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#9C948B;flex:1")},V(R(S,"k.rel"))),"\n                  ",(R(S,"k.onRemove")?F(null,"\n                    ",h("div",{"onClick":R(S,"k.onRemove"),style:CS("cursor:pointer;color:#C9C4BA;font-size:11px"),className:"fp4"},"✕"),"\n                  "):null),"\n                "),"\n                ",h("div",{style:CS("font-size:12.5px;font-weight:500;color:#231F20;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"k.title"))),"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                  ",h("div",{style:CS(("font-size:10.5px;font-weight:600;padding:2px 6px;border-radius:3px;color:"+Z(R(S,"k.statusColor"))+";background:"+Z(R(S,"k.statusBg"))))},V(R(S,"k.statusLabel"))),"\n                  ",h("div",{style:CS("font-size:10.5px;color:#9C948B")},V(R(S,"k.owner"))),"\n                  ",h("div",{style:CS("flex:1")}),"\n                  ",h("div",{style:CS("font-size:10.5px;color:#9C948B;font-variant-numeric:tabular-nums")},V(R(S,"k.due"))),"\n                "),"\n              "),"\n            "]),"\n          "),"\n          ",h("div",{"onClick":R(S,"d.onDepPick"),style:CS("cursor:pointer;margin-top:9px;font-size:11.5px;font-weight:600;color:#0031EB")},"+ Afhængig af …"),"\n          ",(R(S,"d.depPickOpen")?F(null,"\n            ",h("div",{style:CS("margin-top:8px;border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:9px")},"\n              ",h("input",{"value":DV(R(S,"d.depQuery")),"onChange":R(S,"d.onDepQuery"),"placeholder":"Søg efter opgave",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:3px;padding:5px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n              ",h("div",{style:CS("display:flex;flex-direction:column;gap:2px;margin-top:7px")},"\n                ",M(R(S,"d.depCandidates"),S,"c",(S)=>["\n                  ",h("div",{"onClick":R(S,"c.onClick"),style:CS("display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:3px;cursor:pointer"),className:"fp7"},"\n                    ",h("div",{style:CS(("width:3px;height:16px;border-radius:2px;flex:none;background:"+Z(R(S,"c.color"))))}),"\n                    ",h("div",{style:CS("flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"c.title"))),"\n                    ",h("div",{style:CS("font-size:11px;color:#9C948B;flex:none")},V(R(S,"c.owner"))),"\n                  "),"\n                "]),"\n              "),"\n            "),"\n          "):null),"\n        "),"\n\n        ",h("div",{},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:10px")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:12.5px")},"Aktivitet"),"\n            ",h("div",{style:CS("flex:1;height:1px;background:#DFDBD3")}),"\n          "),"\n          ",M(R(S,"d.activity"),S,"a",(S)=>["\n            ",h("div",{style:CS("display:flex;gap:10px;padding:7px 0")},"\n              ",h("div",{style:CS(("width:19px;height:19px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:8.5px;font-weight:600;color:#fff;background:"+Z(R(S,"a.color"))))},V(R(S,"a.initials"))),"\n              ",h("div",{style:CS("flex:1;font-size:12px;color:#4A443F;line-height:1.45")},V(R(S,"a.text"))),"\n              ",h("div",{style:CS("font-size:11px;color:#9C948B;flex:none")},V(R(S,"a.when"))),"\n            "),"\n          "]),"\n          ",h("div",{style:CS("display:flex;flex-direction:column;gap:2px;margin-top:6px")},"\n            ",M(R(S,"d.entries"),S,"e",(S)=>["\n              ",h("div",{style:CS("display:flex;align-items:center;gap:8px;font-size:11px;color:#9C948B;padding:2px 0")},"\n                ",h("div",{style:CS("flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},F(null,V(R(S,"e.who"))," · ",V(R(S,"e.kind"))," · ",V(R(S,"e.date")))),"\n                ",h("div",{style:CS("font-variant-numeric:tabular-nums")},V(R(S,"e.hours"))),"\n                ",(R(S,"e.mine")?F(null,"\n                  ",h("div",{"onClick":R(S,"e.onDelete"),"title":"Slet",style:CS("cursor:pointer;color:#C9C4BA;font-size:10px"),className:"fp4"},"✕"),"\n                "):null),"\n              "),"\n            "]),"\n          "),"\n        "),"\n        "),"\n\n        ",h("div",{style:CS("padding:18px 18px 34px 18px;display:flex;flex-direction:column;gap:16px;background:#FAF9F6")},"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Type"),"\n            ",h("div",{style:CS("display:flex;gap:4px")},"\n              ",M(R(S,"d.typeOpts"),S,"o",(S)=>["\n                ",h("div",{"onClick":R(S,"o.onClick"),"title":R(S,"o.tip"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n              "]),"\n            "),"\n          "),"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Status"),"\n            ",h("div",{style:CS("display:flex;gap:4px;flex-wrap:wrap")},"\n              ",M(R(S,"d.statusOptions"),S,"s",(S)=>["\n                ",h("div",{"onClick":R(S,"s.onClick"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:3px 8px;border-radius:3px;border:1px solid "+Z(R(S,"s.border"))+";color:"+Z(R(S,"s.color"))+";background:"+Z(R(S,"s.bg"))))},V(R(S,"s.label"))),"\n              "]),"\n            "),"\n          "),"\n          ",h("div",{},"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:6px")},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;flex:1")},"Område"),"\n              ",h("div",{"onClick":R(S,"d.onLbToggle"),"title":"Rediger områder",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F;width:22px;height:22px"),className:"fpj"},h("svg",{"width":"13","height":"13","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M4 20h4L19 9l-4-4L4 16z"}))),"\n            "),"\n            ",h("div",{style:CS("display:flex;gap:4px;flex-wrap:wrap")},"\n              ",M(R(S,"d.labelToggles"),S,"l",(S)=>["\n                ",h("div",{"onClick":R(S,"l.onClick"),style:CS(("cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:"+Z(R(S,"l.weight"))+";padding:3px 7px;border-radius:3px;border:1px solid "+Z(R(S,"l.border"))+";background:"+Z(R(S,"l.bg"))+";color:#231F20"))},"\n                  ",h("div",{style:CS(("width:6px;height:6px;border-radius:2px;background:"+Z(R(S,"l.dot"))))}),F(null,V(R(S,"l.name")),"\n                ")),"\n              "]),"\n            "),"\n            ",(R(S,"d.lbOpen")?F(null,"\n              ",h("div",{style:CS("margin-top:8px;border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:10px")},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:8px")},"\n                  ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:12px;font-weight:600;flex:1")},"Område"),"\n                  ",h("div",{"onClick":R(S,"d.onLbToggle"),style:CS("cursor:pointer;color:#9C948B;font-size:13px")},"✕"),"\n                "),"\n                ",h("input",{"value":DV(R(S,"d.lbQ")),"onChange":R(S,"d.onLbQ"),"placeholder":"Søg områder…",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none;margin-bottom:8px"),className:"fpm"}),"\n                ",h("div",{style:CS("display:flex;flex-direction:column;gap:4px")},"\n                  ",M(R(S,"d.lbRows"),S,"l",(S)=>["\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                      ",h("div",{"onClick":R(S,"l.onToggle"),style:CS(("width:14px;height:14px;flex:none;border-radius:3px;cursor:pointer;border:1.5px solid "+Z(R(S,"l.boxBorder"))+";background:"+Z(R(S,"l.boxFill"))+";color:#fff;font-size:9.5px;display:flex;align-items:center;justify-content:center;line-height:1"))},V(R(S,"l.mark"))),"\n                      ",h("div",{"onClick":R(S,"l.onToggle"),style:CS(("flex:1;min-width:0;cursor:pointer;border-radius:3px;padding:5px 9px;font-size:12px;font-weight:600;color:#fff;background:"+Z(R(S,"l.color"))+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap"))},V(R(S,"l.name"))),"\n                      ",h("div",{"onClick":R(S,"l.onEdit"),style:CS("cursor:pointer;font-size:11px;color:#6E675F;flex:none;padding:0 2px"),className:"fp8"},"✎"),"\n                    "),"\n                  "]),"\n                "),"\n                ",(R(S,"d.lbEditing")?F(null,"\n                  ",h("div",{style:CS("margin-top:9px;border-top:1px solid #E9E6E0;padding-top:9px")},"\n                    ",h("div",{style:CS("font-size:11px;font-weight:600;color:#6E675F;margin-bottom:6px")},V(R(S,"d.lbEditHeading"))),"\n                    ",h("input",{"value":DV(R(S,"d.lbName")),"onChange":R(S,"d.onLbName"),"placeholder":"Navn på område",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                    ",h("div",{style:CS("display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:8px 0")},"\n                      ",M(R(S,"d.lbSwatches"),S,"c",(S)=>["\n                        ",h("div",{"onClick":R(S,"c.onClick"),style:CS(("height:22px;border-radius:3px;cursor:pointer;background:"+Z(R(S,"c.color"))+";box-shadow:0 0 0 2px "+Z(R(S,"c.ring"))))}),"\n                      "]),"\n                    "),"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:7px;margin-bottom:9px")},"\n                      ",h("div",{style:CS(("width:22px;height:22px;border-radius:3px;flex:none;background:"+Z(R(S,"d.lbHex"))+";border:1px solid #DFDBD3"))}),"\n                      ",h("input",{"value":DV(R(S,"d.lbHex")),"onChange":R(S,"d.onLbHex"),"placeholder":"#RRGGBB",style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:5px 8px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                    "),"\n                    ",h("div",{style:CS("display:flex;gap:6px")},"\n                      ",h("div",{"onClick":R(S,"d.onLbSave"),style:CS("cursor:pointer;flex:1;text-align:center;font-size:11.5px;font-weight:600;padding:6px;border-radius:3px;color:#fff;background:#231F20")},"Gem"),"\n                      ",h("div",{"onClick":R(S,"d.onLbCancel"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 10px;border-radius:3px;border:1px solid #DFDBD3;color:#4A443F")},"Fortryd"),"\n                      ",(R(S,"d.lbCanDelete")?F(null,"\n                        ",h("div",{"onClick":R(S,"d.onLbDelete"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 10px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D;background:#FDEFE6")},"Slet"),"\n                      "):null),"\n                    "),"\n                  "),"\n                "):null),"\n                ",h("div",{"onClick":R(S,"d.onLbNew"),style:CS("margin-top:9px;cursor:pointer;text-align:center;font-size:11.5px;font-weight:600;padding:7px;border-radius:3px;border:1px dashed #C9C4BA;color:#4A443F"),className:"fpd"},"Opret nyt område"),"\n              "),"\n            "):null),"\n          "),"\n          ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Ejer"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:8px")},"\n              ",h("div",{"title":"Skift ejer",style:CS(("position:relative;width:24px;height:24px;border-radius:4px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"d.ownerColor"))+";cursor:pointer"))},F(null,V(R(S,"d.ownerInitials")),"\n                "),h("select",{"value":DV(R(S,"d.owner2")),"onChange":R(S,"d.onOwnerChange"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},M(R(S,"d.peopleOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n              "),"\n            "),"\n          "),"\n          ",h("div",{},"\n          ",(R(S,"d.showMembers")?F(null,"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Medlemmer"),"\n              ",h("div",{style:CS("display:flex;gap:5px")},"\n                ",M(R(S,"d.memberToggles"),S,"m",(S)=>["\n                  ",h("div",{"onClick":R(S,"m.onClick"),"title":R(S,"m.name"),style:CS(("cursor:pointer;width:23px;height:23px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;background:"+Z(R(S,"m.bg"))+";color:"+Z(R(S,"m.color"))))},V(R(S,"m.initials"))),"\n                "]),"\n              "),"\n            "),"\n          "):null),"\n          ",(R(S,"d.showAddMember")?F(null,"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Medlemmer"),"\n            ",h("div",{"onClick":R(S,"d.onOpenMembers"),style:CS("cursor:pointer;font-size:11px;font-weight:600;color:#0031EB;")},"+ Tilføj"),"\n          "):null),"\n          "),"\n          "),"\n          ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Deadline"),"\n            ",(R(S,"d.dueShow")?F(null,"\n              ",h(window.FlowDate,{"value":DV(R(S,"d.dueValue")),"onChange":R(S,"d.onDueChange"),style:CS(("width:100%;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:4px 6px;font-size:12px;font-weight:600;font-family:inherit;color:"+Z(R(S,"d.dueColor"))+";background:#fff;outline:none")),className:"fpm"}),"\n            "):null),"\n            ",(R(S,"d.dueEmpty")?F(null,"\n              ",h("div",{"onClick":R(S,"d.onDueOpen"),"title":"Vælg deadline",style:CS("cursor:pointer;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"3","y":"5","width":"18","height":"16","rx":"2"}),h("path",{"d":"M16 3v4M8 3v4M3 10h18"}))),"\n            "):null),"\n          "),"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Tid"),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n              ",h("div",{"onClick":R(S,"d.onTimer"),"title":R(S,"d.timerLabel"),style:CS(("cursor:pointer;flex:none;width:26px;height:26px;box-sizing:border-box;border-radius:50%;border:1px solid "+Z(R(S,"d.timerBorder"))+";background:"+Z(R(S,"d.timerBg"))+";color:"+Z(R(S,"d.timerColor"))+";display:flex;align-items:center;justify-content:center;font-size:11px"))},V(R(S,"d.timerIcon"))),"\n              ",h("div",{style:CS(("flex:1;min-width:0;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;color:"+Z(R(S,"d.timeMainColor"))+";white-space:nowrap"))},V(R(S,"d.timeMain"))),"\n            "),"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:2px;margin-top:3px;font-size:11px;color:#9C948B")},"af ",h("input",{"value":DV(R(S,"d.estValue")),"onChange":R(S,"d.onEstChange"),"placeholder":"–",style:CS("width:34px;border:1px solid transparent;border-radius:3px;padding:2px 5px;font-size:12px;font-family:inherit;color:#231F20;background:transparent;outline:none;font-variant-numeric:tabular-nums"),className:"fpl fpi"})," t"),"\n            ",h("div",{"onClick":R(S,"d.onLogOpen"),style:CS("cursor:pointer;display:inline-block;margin-top:4px;font-size:11.5px;font-weight:600;color:#0031EB"),className:"fph"},V(R(S,"d.logLinkLabel"))),"\n          "),"\n          "),"\n          ",(R(S,"d.logOpen")?F(null,"\n              ",h("div",{style:CS("margin-top:8px;border:1px solid #DFDBD3;background:#fff;border-radius:5px;padding:9px 10px")},"\n              ",h("div",{style:CS("font-size:11px;color:#6E675F;margin-bottom:6px")},"Registrér tid, du har brugt uden timer"),"\n              ",h("div",{style:CS("display:flex;gap:6px;align-items:center")},"\n                ",h("input",{"value":DV(R(S,"d.logHours")),"onChange":R(S,"d.onLogHours"),"onKeyDown":R(S,"d.onLogKey"),"placeholder":"fx 1,5",style:CS("width:58px;flex:none;border:1px solid #DFDBD3;border-radius:3px;padding:4px 6px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none;text-align:right"),className:"fpm"}),"\n                ",h("div",{style:CS("font-size:11px;color:#6E675F;flex:none")},"t"),"\n                ",h(window.FlowDate,{"value":DV(R(S,"d.logDate")),"onChange":R(S,"d.onLogDate"),style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:3px;padding:4px 6px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                ",h("div",{"onClick":R(S,"d.onLogSave"),style:CS("cursor:pointer;flex:none;font-size:11px;font-weight:600;padding:5px 10px;border-radius:3px;background:#231F20;color:#fff")},"Tilføj"),"\n              "),"\n              ",h("div",{style:CS("display:flex;gap:4px;margin-top:6px")},"\n                ",M(R(S,"d.logQuick"),S,"q",(S)=>[h("div",{"onClick":R(S,"q.onClick"),style:CS("cursor:pointer;font-size:11px;padding:3px 8px;border:1px solid #DFDBD3;border-radius:10px;color:#4A443F"),className:"fpd"},V(R(S,"q.label")))]),"\n              "),"\n              "),"\n            "):null),"\n          ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n          ",h("div",{},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Prioritet"),"\n            ",h("div",{style:CS("display:flex;gap:4px;flex-wrap:wrap")},"\n              ",M(R(S,"d.prioOptions"),S,"p",(S)=>["\n                ",h("div",{"onClick":R(S,"p.onClick"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:3px 8px;border-radius:3px;border:1px solid "+Z(R(S,"p.border"))+";color:"+Z(R(S,"p.color"))+";background:"+Z(R(S,"p.bg"))))},V(R(S,"p.label"))),"\n              "]),"\n            "),"\n          "),"\n          ",(R(S,"d.canPrivate")?F(null,"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Synlighed"),"\n              ",h("div",{style:CS("display:flex;gap:4px")},"\n                ",M(R(S,"d.visOpts"),S,"o",(S)=>["\n                  ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n                "]),"\n              "),"\n            "),"\n          "):null),"\n\n\n          "),"\n\n          ",(R(S,"d.recurring")?F(null,"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:6px")},"Gentagelse"),"\n              ",h("div",{style:CS("font-size:11.5px;color:#4A443F")},F(null,"↻ ",V(R(S,"d.recurring")))),"\n            "),"\n          "):null),"\n\n          ",h("div",{style:CS("border-top:1px solid #E9E6E0;padding-top:14px")},"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:9px")},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Kommentarer"),"\n              ",h("div",{style:CS("font-size:11px;color:#9C948B")},V(R(S,"d.commentCount"))),"\n            "),"\n\n            ",h("div",{style:CS("display:flex;flex-direction:column;gap:10px")},"\n              ",M(R(S,"d.comments"),S,"c",(S)=>["\n                ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:9px 10px")},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                    ",h("div",{style:CS(("width:19px;height:19px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:8.5px;font-weight:600;color:#fff;background:"+Z(R(S,"c.color"))))},V(R(S,"c.initials"))),"\n                    ",h("div",{style:CS("font-size:11.5px;font-weight:600;color:#231F20;flex:1")},V(R(S,"c.name"))),"\n                    ",h("div",{style:CS("font-size:10.5px;color:#9C948B")},V(R(S,"c.when"))),"\n                  "),"\n                  ",h("div",{style:CS("font-size:12px;color:#4A443F;line-height:1.5;margin-top:5px;text-wrap:pretty")},V(R(S,"c.text"))),"\n\n                  ",h("div",{style:CS("display:flex;flex-direction:column;gap:7px;margin-top:8px")},"\n                    ",M(R(S,"c.replies"),S,"r",(S)=>["\n                      ",h("div",{style:CS("border-left:2px solid #E9E6E0;padding-left:9px")},"\n                        ",h("div",{style:CS("display:flex;align-items:center;gap:6px")},"\n                          ",h("div",{style:CS(("width:16px;height:16px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:7.5px;font-weight:600;color:#fff;background:"+Z(R(S,"r.color"))))},V(R(S,"r.initials"))),"\n                          ",h("div",{style:CS("font-size:11px;font-weight:600;color:#231F20;flex:1")},V(R(S,"r.name"))),"\n                          ",h("div",{style:CS("font-size:10.5px;color:#9C948B")},V(R(S,"r.when"))),"\n                        "),"\n                        ",h("div",{style:CS("font-size:11.5px;color:#4A443F;line-height:1.45;margin-top:3px")},V(R(S,"r.text"))),"\n                      "),"\n                    "]),"\n                  "),"\n\n                  ",(R(S,"c.replyOpen")?F(null,"\n                    ",h("div",{style:CS("display:flex;gap:6px;margin-top:9px")},"\n                      ",h("input",{"value":DV(R(S,"c.replyValue")),"onChange":R(S,"c.onReplyChange"),"onKeyDown":R(S,"c.onReplyKey"),"placeholder":"Svar i tråden",style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:3px;padding:5px 8px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                      ",h("div",{"onClick":R(S,"c.onReplySend"),style:CS("cursor:pointer;flex:none;font-size:11px;font-weight:600;padding:5px 9px;border-radius:3px;background:#231F20;color:#fff")},"Svar"),"\n                    "),"\n                  "):null),"\n                  ",h("div",{"onClick":R(S,"c.onReplyOpen"),style:CS("cursor:pointer;font-size:11px;font-weight:600;color:#0031EB;margin-top:8px")},"Svar i tråd"),"\n                "),"\n              "]),"\n            "),"\n\n            ",h("div",{style:CS("margin-top:10px")},"\n              ",h("textarea",{"value":DV(R(S,"d.cmtValue")),"onChange":R(S,"d.onCmtChange"),"onKeyDown":R(S,"d.onCmtKey"),"rows":"2","placeholder":"Skriv en kommentar — @navn giver besked",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:8px 9px;font-size:12px;font-family:inherit;line-height:1.45;color:#231F20;background:#fff;outline:none;resize:vertical"),className:"fpm"}),"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:5px;margin-top:6px")},"\n                ",M(R(S,"d.mentionChips"),S,"m",(S)=>["\n                  ",h("div",{"onClick":R(S,"m.onClick"),style:CS("cursor:pointer;font-size:10.5px;font-weight:600;color:#0031EB;border:1px solid #DFDBD3;border-radius:3px;padding:3px 7px;background:#fff"),className:"fp9"},V(R(S,"m.name"))),"\n                "]),"\n                ",h("div",{style:CS("flex:1")}),"\n                ",h("div",{"onClick":R(S,"d.onCmtSend"),style:CS("cursor:pointer;font-size:11px;font-weight:600;padding:5px 11px;border-radius:3px;background:#231F20;color:#fff")},"Send"),"\n              "),"\n            "),"\n          "),"\n        "),"\n      "),"\n\n      ",h("div",{style:CS("flex:none;border-top:1px solid #DFDBD3;padding:11px 20px;display:flex;align-items:center;gap:9px;background:#FAF9F6")},"\n        ",h("div",{style:CS(("flex:1;display:flex;align-items:center;font-size:12px;font-weight:600;color:#123C2F;opacity:"+Z(R(S,"d.savedOpacity"))+";transition:opacity .3s"))},"✓ Gemt"),"\n        ",h("div",{"onClick":R(S,"d.onEdit"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 14px;border-radius:4px;border:1px solid #DFDBD3;color:#4A443F;background:#fff"),className:"fp3"},"Redigér"),"\n        ",h("div",{"onClick":R(S,"d.onArchive"),"title":R(S,"d.archiveLabel"),style:CS(("cursor:pointer;flex:none;width:36px;height:36px;box-sizing:border-box;border-radius:4px;border:1px solid "+Z(R(S,"d.archiveBorder"))+";background:"+Z(R(S,"d.archiveBg"))+";color:"+Z(R(S,"d.archiveColor"))+";display:flex;align-items:center;justify-content:center")),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"3","y":"4","width":"18","height":"5","rx":"1"}),h("path",{"d":"M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"}),h("path",{"d":"M10 13h4"}))),"\n      "),"\n    "),"\n    "),"\n  "):null),"\n\n  ",(R(S,"b")?F(null,"\n    ",h("div",{"data-bd":"1","onClick":R(S,"b.onCancel"),style:CS("position:fixed;inset:0;z-index:90;background:rgba(35,31,32,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto")},"\n      ",h("div",{"onClick":R(S,"stopClick"),style:CS("width:980px;background:#fff;border-radius:6px;box-shadow:0 18px 60px rgba(16,16,20,.28);display:flex;flex-direction:column;overflow:hidden")},"\n\n        ",h("div",{style:CS("padding:17px 22px;border-bottom:1px solid #DFDBD3;display:flex;align-items:flex-start;gap:12px")},"\n          ",h("div",{style:CS("flex:1")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:16px;letter-spacing:-0.015em")},"Opret flere opgaver"),"\n            ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:2px")},"Alle opgaver lander i Pipeline, så du kan sortere dem bagefter"),"\n          "),"\n          ",h("div",{"onClick":R(S,"b.onCancel"),style:CS("cursor:pointer;color:#9C948B;font-size:17px;line-height:1;padding:2px 4px")},"✕"),"\n        "),"\n\n        ",h("div",{style:CS("padding:16px 22px 0 22px;display:flex;gap:6px")},"\n          ",M(R(S,"b.tabs"),S,"t",(S)=>["\n            ",h("div",{"onClick":R(S,"t.onClick"),style:CS(("cursor:pointer;font-size:12.5px;font-weight:600;padding:6px 13px;border-radius:3px;border:1px solid "+Z(R(S,"t.border"))+";background:"+Z(R(S,"t.bg"))+";color:"+Z(R(S,"t.color"))))},V(R(S,"t.label"))),"\n          "]),"\n        "),"\n\n        ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 262px;align-items:start")},"\n          ",h("div",{style:CS("padding:18px 22px;display:flex;flex-direction:column;gap:16px;border-right:1px solid #E9E6E0")},"\n\n            ",(R(S,"b.isPaste")?F(null,"\n              ",h("div",{style:CS("display:flex;flex-direction:column;gap:14px")},"\n                ",h("div",{},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:7px")},"\n                    ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Indsæt kolonner"),"\n                    ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n                    ",h("div",{"onClick":R(S,"b.onHeader"),style:CS("display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11.5px;color:#4A443F")},"\n                      ",h("div",{style:CS(("width:13px;height:13px;border-radius:3px;border:1.5px solid "+Z(R(S,"b.headerBorder"))+";background:"+Z(R(S,"b.headerFill"))+";color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;line-height:1"))},V(R(S,"b.headerLabel"))),"\n                      Første række er overskrifter\n                    "),"\n                  "),"\n                  ",h("textarea",{"value":DV(R(S,"b.raw")),"onChange":R(S,"b.onRaw"),"rows":"6","placeholder":"Opgave\tOmråde\tEjer\tDeadline\tEstimat\nOktober avis\tAvis\tLouise\t26/10\t24\nBlack Friday landingsside\tKampagner\tDitte\t14/11\t12",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:10px 11px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6;color:#231F20;background:#FAF9F6;outline:none;resize:vertical;white-space:pre"),className:"fpm"}),"\n                  ",h("div",{style:CS("font-size:11px;color:#9C948B;margin-top:6px")},"Kopiér cellerne i Excel og indsæt her. Tabulator, semikolon og komma virker alle som skilletegn."),"\n                "),"\n\n                ",(R(S,"b.hasRows")?F(null,"\n                  ",h("div",{},"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:8px")},"\n                      ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Kolonner"),"\n                      ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n                    "),"\n                    ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:7px")},"\n                      ",M(R(S,"b.cols"),S,"c",(S)=>["\n                        ",h("div",{style:CS("display:flex;flex-direction:column;gap:3px")},"\n                          ",h("div",{style:CS("font-size:10.5px;color:#9C948B;max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"c.head"))),"\n                          ",h("select",{"value":DV(R(S,"c.value")),"onChange":R(S,"c.onChange"),style:CS("width:132px;border:1px solid #DFDBD3;border-radius:4px;padding:5px 7px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"c.opts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                        "),"\n                      "]),"\n                    "),"\n                  "),"\n\n                  ",h("div",{},"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:8px")},"\n                      ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Forhåndsvisning"),"\n                      ",h("div",{style:CS("font-size:11.5px;color:#9C948B")},V(R(S,"b.summary"))),"\n                      ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n                    "),"\n                    ",h("div",{style:CS("border:1px solid #DFDBD3;border-radius:4px;overflow:hidden")},"\n                      ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 128px 96px 82px 58px;gap:0;background:#F7F5F1;border-bottom:1px solid #DFDBD3;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6E675F")},"\n                        ",h("div",{style:CS("padding:7px 12px")},"Opgave"),"\n                        ",h("div",{style:CS("padding:7px 8px")},"Område"),"\n                        ",h("div",{style:CS("padding:7px 8px")},"Ejer"),"\n                        ",h("div",{style:CS("padding:7px 8px")},"Deadline"),"\n                        ",h("div",{style:CS("padding:7px 8px;text-align:right")},"Est."),"\n                      "),"\n                      ",M(R(S,"b.rows"),S,"r",(S)=>["\n                        ",h("div",{style:CS("border-top:1px solid #E9E6E0")},"\n                          ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 128px 96px 82px 58px;align-items:center;font-size:12px")},"\n                            ",h("div",{style:CS("padding:8px 12px;min-width:0;display:flex;align-items:center;gap:8px")},"\n                              ",h("div",{style:CS(("width:3px;height:17px;border-radius:2px;flex:none;background:"+Z(R(S,"r.projectColor"))))}),"\n                              ",h("div",{style:CS(("min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:"+Z(R(S,"r.titleColor"))))},V(R(S,"r.title"))),"\n                              ",h("div",{style:CS(("font-size:11px;font-weight:600;color:"+Z(R(S,"r.prioColor"))+";flex:none"))},V(R(S,"r.prio"))),"\n                            "),"\n                            ",h("div",{style:CS("padding:8px;color:#4A443F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.project"))),"\n                            ",h("div",{style:CS("padding:8px;display:flex;align-items:center;gap:6px;min-width:0")},"\n                              ",h("div",{style:CS(("width:17px;height:17px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:8px;font-weight:600;color:#fff;background:"+Z(R(S,"r.ownerColor"))))},V(R(S,"r.ownerInitials"))),"\n                              ",h("div",{style:CS("color:#4A443F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.owner"))),"\n                            "),"\n                            ",h("div",{style:CS(("padding:8px;color:"+Z(R(S,"r.dueColor"))+";font-variant-numeric:tabular-nums"))},V(R(S,"r.due"))),"\n                            ",h("div",{style:CS(("padding:8px;text-align:right;color:"+Z(R(S,"r.estColor"))+";font-variant-numeric:tabular-nums"))},V(R(S,"r.est"))),"\n                          "),"\n                          ",(R(S,"r.issue")?F(null,"\n                            ",h("div",{style:CS("font-size:11px;color:#9C160D;background:#FDEFE6;padding:5px 12px 6px 23px")},V(R(S,"r.issue"))),"\n                          "):null),"\n                        "),"\n                      "]),"\n                    "),"\n                  "),"\n                "):null),"\n              "),"\n            "):null),"\n\n            ",(R(S,"b.isTpl")?F(null,"\n              ",h("div",{},"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:9px")},"\n                  ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Vælg skabeloner"),"\n                  ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n                  \n                "),"\n                ",h("div",{style:CS("display:flex;flex-direction:column;gap:6px")},"\n                  ",M(R(S,"b.templates"),S,"t",(S)=>["\n                    ",h("div",{"onClick":R(S,"t.onToggle"),style:CS(("display:flex;align-items:center;gap:11px;cursor:pointer;border:1px solid "+Z(R(S,"t.border"))+";background:"+Z(R(S,"t.bg"))+";border-radius:4px;padding:11px 13px")),className:"fp3"},"\n                      ",h("div",{style:CS(("width:14px;height:14px;border-radius:3px;flex:none;border:1.5px solid "+Z(R(S,"t.boxBorder"))+";background:"+Z(R(S,"t.boxFill"))+";color:#fff;font-size:9.5px;display:flex;align-items:center;justify-content:center;line-height:1"))},V(R(S,"t.mark"))),"\n                      ",h("div",{style:CS(("width:3px;height:26px;border-radius:2px;flex:none;background:"+Z(R(S,"t.color"))))}),"\n                      ",h("div",{style:CS("flex:1;min-width:0")},"\n                        ",h("input",{"value":DV(R(S,"t.name")),"onChange":R(S,"t.onRename"),"onClick":R(S,"stopClick"),"title":"Omdøb",style:CS("width:100%;border:1px solid transparent;border-radius:3px;padding:2px 5px;margin-left:-5px;font-size:13px;font-weight:500;font-family:inherit;color:#231F20;background:transparent;outline:none;box-sizing:border-box"),className:"fpl fpi"}),"\n                        ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:2px")},F(null,V(R(S,"t.project"))," · ",V(R(S,"t.meta")))),"\n                      "),"\n                      ",h("div",{"onClick":R(S,"t.onDelete"),"title":"Slet skabelon",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F"),className:"fpk"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M4 7h16"}),h("path",{"d":"M10 11v6"}),h("path",{"d":"M14 11v6"}),h("path",{"d":"M6 7l1 13h10l1-13"}),h("path",{"d":"M9 7V4h6v3"}))),"\n                    "),"\n                  "]),"\n                "),"\n              "),"\n            "):null),"\n          "),"\n\n          ",h("div",{style:CS("padding:18px 22px;display:flex;flex-direction:column;gap:16px;background:#FAF9F6")},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Gælder alle"),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:5px")},"Ejer"),"\n              ",h("select",{"value":DV(R(S,"b.shOwner")),"onChange":R(S,"b.onShOwner"),style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"b.ownerOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n            "),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:5px")},"Deadline"),"\n              ",h(window.FlowDate,{"value":DV(R(S,"b.shDue")),"onChange":R(S,"b.onShDue"),style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n            "),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:5px")},"Prioritet"),"\n              ",h("select",{"value":DV(R(S,"b.shPrio")),"onChange":R(S,"b.onShPrio"),style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"b.prioOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n            "),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-bottom:5px")},"Medlemmer"),"\n              ",h("div",{style:CS("display:flex;flex-direction:column;gap:5px")},"\n                ",M(R(S,"b.memberOpts"),S,"p",(S)=>["\n                  ",h("div",{"onClick":R(S,"p.onClick"),style:CS(("display:flex;align-items:center;gap:8px;cursor:pointer;border:1px solid "+Z(R(S,"p.border"))+";background:"+Z(R(S,"p.bg"))+";border-radius:4px;padding:5px 8px"))},"\n                    ",h("div",{style:CS(("width:20px;height:20px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;background:"+Z(R(S,"p.avatarBg"))+";color:"+Z(R(S,"p.avatarColor"))))},V(R(S,"p.initials"))),"\n                    ",h("div",{style:CS(("font-size:12.5px;color:"+Z(R(S,"p.color"))))},V(R(S,"p.name"))),"\n                  "),"\n                "]),"\n              "),"\n            "),"\n\n            ",h("div",{style:CS("font-size:11px;color:#9C948B;line-height:1.5")},"Et valg her overskriver det, der står i kolonnerne."),"\n          "),"\n        "),"\n\n        ",h("div",{style:CS("border-top:1px solid #DFDBD3;padding:14px 22px;display:flex;align-items:center;gap:9px;background:#fff")},"\n          ",h("div",{style:CS("flex:1;font-size:11.5px;color:#9C948B")},V(R(S,"b.summary"))),"\n          ",h("div",{"onClick":R(S,"b.onCancel"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 14px;border-radius:4px;border:1px solid #DFDBD3;color:#4A443F;background:#fff"),className:"fp3"},"Annullér"),"\n          ",h("div",{"onClick":R(S,"b.onCreate"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 18px;border-radius:4px;color:#fff;background:#231F20"),className:"fp5"},V(R(S,"b.createLabel"))),"\n        "),"\n      "),"\n    "),"\n  "):null),"\n\n  ",(R(S,"ppl")?F(null,"\n    ",h("div",{"data-bd":"1","onClick":R(S,"ppl.onClose"),style:CS("position:fixed;inset:0;z-index:95;background:rgba(35,31,32,.45);display:flex;align-items:flex-start;justify-content:center;padding:60px 20px;overflow-y:auto")},"\n      ",h("div",{"onClick":R(S,"stopClick"),style:CS("width:420px;max-width:100%;background:#fff;border:1px solid #DFDBD3;border-radius:6px;box-shadow:0 18px 60px rgba(35,31,32,.28);overflow:hidden")},"\n        ",h("div",{style:CS("padding:15px 18px;border-bottom:1px solid #DFDBD3;display:flex;align-items:center;gap:10px")},"\n          ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:15px;flex:1")},"Team"),"\n          ",h("div",{"onClick":R(S,"ppl.onClose"),style:CS("cursor:pointer;color:#9C948B;font-size:16px")},"✕"),"\n        "),"\n        ",h("div",{style:CS("padding:16px 18px;display:flex;flex-direction:column;gap:6px")},"\n          ",(R(S,"ppl.hasRequests")?F(null,"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:2px")},"Venter på godkendelse"),"\n            ",M(R(S,"ppl.requests"),S,"r",(S)=>["\n              ",h("div",{style:CS("display:flex;align-items:center;gap:8px;border:1px solid #F4C7AC;background:#FDEFE6;border-radius:4px;padding:8px 10px")},"\n                ",h("div",{style:CS("flex:1;min-width:0")},"\n                  ",h("div",{style:CS("font-size:13px;font-weight:500")},V(R(S,"r.name"))),"\n                  ",h("div",{style:CS("font-size:11px;color:#9C948B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"r.email"))),"\n                "),"\n                ",h("select",{"value":DV(R(S,"r.link")),"onChange":R(S,"r.onLink"),style:CS("border:1px solid #DFDBD3;border-radius:4px;padding:4px 6px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"r.opts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                ",h("div",{"onClick":R(S,"r.onApprove"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 9px;border-radius:4px;background:#123C2F;color:#fff")},"Godkend"),"\n                ",h("div",{"onClick":R(S,"r.onReject"),"title":"Afvis",style:CS("cursor:pointer;color:#C9C4BA;font-size:12px"),className:"fp4"},"✕"),"\n              "),"\n            "]),"\n            ",h("div",{style:CS("height:8px")}),"\n          "):null),"\n          ",M(R(S,"ppl.rows"),S,"p",(S)=>["\n            ",h("div",{style:CS("display:flex;align-items:center;gap:9px;border:1px solid #DFDBD3;border-radius:4px;padding:8px 10px")},"\n              ",h("div",{style:CS(("width:24px;height:24px;border-radius:3px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9.5px;font-weight:600;color:#fff;background:"+Z(R(S,"p.color"))))},V(R(S,"p.initials"))),"\n              ",h("div",{style:CS("flex:1;min-width:0")},"\n                ",h("div",{style:CS("font-size:13px;font-weight:500")},V(R(S,"p.name"))),"\n                ",h("div",{style:CS("font-size:11px;color:#9C948B")},V(R(S,"p.count"))),"\n              "),"\n              ",(R(S,"p.inviteLabel")?F(null,"\n                ",h("div",{"onClick":R(S,"p.onInvite"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;color:#123C2F;margin-right:4px"),className:"fph"},V(R(S,"p.inviteLabel"))),"\n              "):null),"\n              ",h("div",{"onClick":R(S,"p.onEdit"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;color:#0031EB")},"Rediger"),"\n              ",h("div",{"onClick":R(S,"p.onDelete"),style:CS("cursor:pointer;color:#C9C4BA;font-size:12px"),className:"fp4"},"✕"),"\n            "),"\n          "]),"\n\n          ",(R(S,"ppl.editing")?F(null,"\n            ",h("div",{style:CS("border-top:1px solid #EFECE6;margin-top:6px;padding-top:11px")},"\n              ",h("div",{style:CS("font-size:11px;font-weight:600;color:#6E675F;margin-bottom:6px")},V(R(S,"ppl.heading"))),"\n              ",h("input",{"value":DV(R(S,"ppl.name")),"onChange":R(S,"ppl.onName"),"placeholder":"Navn",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:7px 9px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n              ",h("input",{"value":DV(R(S,"ppl.email")),"onChange":R(S,"ppl.onEmail"),"placeholder":"E-mail (login)",style:CS("width:100%;margin-top:6px;border:1px solid #DFDBD3;border-radius:4px;padding:7px 9px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n              ",h("div",{style:CS("display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:9px 0")},"\n                ",M(R(S,"ppl.swatches"),S,"c",(S)=>["\n                  ",h("div",{"onClick":R(S,"c.onClick"),style:CS(("height:22px;border-radius:3px;cursor:pointer;background:"+Z(R(S,"c.color"))+";box-shadow:0 0 0 2px "+Z(R(S,"c.ring"))))}),"\n                "]),"\n              "),"\n              ",h("div",{"onClick":R(S,"ppl.onSave"),style:CS("cursor:pointer;text-align:center;font-size:12px;font-weight:600;padding:8px;border-radius:4px;background:#231F20;color:#fff")},"Gem"),"\n            "),"\n          "):null),"\n\n          ",h("div",{"onClick":R(S,"ppl.onNew"),style:CS("margin-top:6px;cursor:pointer;text-align:center;font-size:12px;font-weight:600;padding:8px;border-radius:4px;border:1px dashed #C9C4BA;color:#4A443F"),className:"fpd"},"Tilføj person"),"\n          ",(R(S,"ppl.canTeams")?F(null,"\n            ",h("div",{style:CS("border-top:1px solid #EFECE6;margin-top:10px;padding-top:11px")},"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:6px")},"\n                ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;flex:1")},"Teams"),"\n                ",h("div",{style:CS(("font-size:11px;font-weight:600;color:"+Z(R(S,"ppl.teamsStatusColor"))))},V(R(S,"ppl.teamsStatus"))),"\n              "),"\n              ",h("div",{style:CS("display:flex;gap:6px")},"\n                ",h("input",{"value":DV(R(S,"ppl.teamsDraft")),"onChange":R(S,"ppl.onTeamsDraft"),"placeholder":"Workflow-URL fra Power Automate","autoComplete":"off",style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:7px 9px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                ",h("div",{"onClick":R(S,"ppl.onTeamsSave"),style:CS("cursor:pointer;font-size:12px;font-weight:600;padding:7px 12px;border-radius:4px;background:#231F20;color:#fff")},"Gem"),"\n              "),"\n            "),"\n          "):null),"\n        "),"\n      "),"\n    "),"\n  "):null),"\n\n  ",h("input",{"type":"file","multiple":true,"ref":R(S,"fileRef"),"onChange":R(S,"onFileInput"),style:CS("display:none")}),"\n\n  ",(R(S,"m")?F(null,"\n    ",h("div",{"data-bd":"1","onClick":R(S,"m.onCancel"),style:CS("position:fixed;inset:0;z-index:90;background:rgba(35,31,32,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:hidden")},"\n      ",h("div",{"onClick":R(S,"stopClick"),style:CS("width:840px;max-width:100%;max-height:calc(100vh - 80px);background:#fff;border-radius:6px;box-shadow:0 18px 60px rgba(16,16,20,.28);display:flex;flex-direction:column;overflow:hidden")},"\n\n        ",h("div",{style:CS("flex:none;padding:17px 22px;border-bottom:1px solid #DFDBD3;display:flex;align-items:flex-start;gap:12px")},"\n          ",h("div",{style:CS("flex:1")},"\n            ",h("div",{style:CS("font-family:Archivo,sans-serif;font-weight:600;font-size:16px;letter-spacing:-0.015em")},V(R(S,"m.heading"))),"\n            \n          "),"\n          ",(R(S,"m.isNew")?F(null,"\n            ",h("div",{"onClick":R(S,"m.onMailToggle"),"title":"Opret opgaven ud fra en mail",style:CS(("cursor:pointer;border:1px solid "+Z(R(S,"m.mailBtnBorder"))+";color:#4A443F;border-radius:4px;padding:5px 11px;font-size:12px;font-weight:600;background:"+Z(R(S,"m.mailBtnBg"))+";display:flex;align-items:center;gap:6px")),className:"fp9"},h("svg",{"width":"13","height":"13","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.2","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"3","y":"5","width":"18","height":"14","rx":"2"}),h("path",{"d":"M3 7l9 6 9-6"})),"Fra mail"),"\n          "):null),"\n          ",(R(S,"m.hasTpl")?F(null,"\n            ",h("div",{"title":"Start fra skabelon",style:CS("position:relative;cursor:pointer;border:1px solid #DFDBD3;color:#4A443F;border-radius:4px;padding:5px 11px;font-size:12px;font-weight:600;background:#fff"),className:"fp3"},"Skabelon\n              ",h("select",{"value":DV(""),"onChange":R(S,"m.onTpl"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},h("option",{"value":""},"Vælg skabelon"),M(R(S,"m.tplOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n            "),"\n          "):null),"\n          ",(R(S,"m.isNew")?F(null,"\n            ",h("div",{"onClick":R(S,"m.onBatch"),style:CS("cursor:pointer;border:1px solid #DFDBD3;color:#4A443F;border-radius:4px;padding:5px 11px;font-size:12px;font-weight:600;background:#fff"),className:"fp3"},"Batch"),"\n          "):null),"\n          ",h("div",{"onClick":R(S,"m.onCancel"),style:CS("cursor:pointer;color:#9C948B;font-size:17px;line-height:1;padding:2px 4px")},"✕"),"\n        "),"\n\n        ",h("div",{style:CS("flex:1;min-height:0;overflow-y:auto")},"\n        ",h("div",{style:CS("display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:0;align-items:stretch")},"\n\n          ",h("div",{style:CS("padding:20px 22px;display:flex;flex-direction:column;gap:20px;border-right:1px solid #E9E6E0")},"\n            ",(R(S,"m.mailOpen")?F(null,"\n              ",h("div",{style:CS("border:1px solid #CFDCF7;background:#F5F8FE;border-radius:6px;padding:14px")},"\n                ",h("div",{"onDragOver":R(S,"m.onMailDragOver"),"onDrop":R(S,"m.onMailDrop"),style:CS("border:1.5px dashed #9DB4F2;border-radius:5px;background:#fff;padding:16px;text-align:center")},"\n                  ",h("div",{style:CS("font-size:13px;font-weight:600;color:#231F20")},"Træk mailen hertil fra Outlook"),"\n                  ",h("div",{style:CS("font-size:11.5px;color:#6E675F;margin-top:4px")},"eller ",h("label",{style:CS("color:#0031EB;cursor:pointer;font-weight:600")},"vælg en .msg- eller .eml-fil",h("input",{"type":"file","accept":".msg,.eml,.txt","onChange":R(S,"m.onMailPick"),style:CS("display:none")}))),"\n                "),"\n                ",h("textarea",{"value":DV(R(S,"m.mailText")),"onChange":R(S,"m.onMailText"),"onDrop":R(S,"m.onMailDrop"),"rows":"4","placeholder":"… eller kopiér mailen (Ctrl+A, Ctrl+C) og sæt den ind her",style:CS("margin-top:10px;width:100%;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:8px 10px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;resize:vertical;outline:none"),className:"fpm"}),"\n                ",(R(S,"m.mailErr")?F(null,"\n                  ",h("div",{style:CS("font-size:11.5px;color:#9C160D;margin-top:6px")},V(R(S,"m.mailErr"))),"\n                "):null),"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-top:10px")},"\n                  ",h("div",{style:CS("flex:1;font-size:11px;color:#6E675F;line-height:1.45")},"Flow finder titel, deadline, område, prioritet og punktlister. Du tjekker det, før opgaven oprettes."),"\n                  ",(R(S,"m.mailBusy")?F(null,h("div",{style:CS("font-size:11.5px;color:#6E675F")},"Læser…")):null),"\n                  ",h("div",{"onClick":R(S,"m.onMailClose"),style:CS("cursor:pointer;font-size:12px;font-weight:600;color:#6E675F;padding:6px 8px")},"Luk"),"\n                  ",h("div",{"onClick":R(S,"m.onMailFill"),style:CS("cursor:pointer;font-size:12px;font-weight:600;color:#fff;background:#0031EB;border-radius:4px;padding:6px 12px")},"Udfyld opgaven"),"\n                "),"\n              "),"\n            "):null),"\n            ",(R(S,"m.mailNote")?F(null,"\n              ",h("div",{style:CS("display:flex;gap:10px;align-items:flex-start;border:1px solid #CFDCF7;background:#EDF1FD;border-radius:5px;padding:10px 12px")},"\n                ",h("div",{style:CS("flex:1;font-size:12px;color:#1F2F6B;line-height:1.5")},V(R(S,"m.mailNote"))),"\n                ",h("div",{"onClick":R(S,"m.onMailNoteClose"),style:CS("cursor:pointer;color:#6E7BB0;font-size:13px")},"✕"),"\n              "),"\n            "):null),"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Titel"),"\n              ",h("input",{"value":DV(R(S,"m.title")),"onChange":R(S,"m.onTitle"),"placeholder":"Hvad skal der laves?",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:9px 11px;font-size:14px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n            "),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Beskrivelse"),"\n              ",h("textarea",{"value":DV(R(S,"m.desc")),"onChange":R(S,"m.onDesc"),"rows":"3","placeholder":"Kontekst, links, aftaler",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:9px 11px;font-size:12.5px;font-family:inherit;line-height:1.5;color:#231F20;background:#fff;outline:none;resize:vertical"),className:"fpm"}),"\n            "),"\n\n            ",h("div",{},"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:9px")},"\n                ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Checkliste"),"\n                ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n                ",(R(S,"m.hasItems")?F(null,"\n                  ",h("div",{"onClick":R(S,"m.onClearAsk"),style:CS("cursor:pointer;font-size:11px;font-weight:600;color:#9C160D")},"Slet alle"),"\n                "):null),"\n              "),"\n              ",(R(S,"m.clearAsk")?F(null,"\n                ",h("div",{style:CS("margin-bottom:8px;border:1px solid #F4C7AC;background:#FDEFE6;border-radius:3px;padding:9px 11px;display:flex;align-items:center;gap:8px")},"\n                  ",h("div",{style:CS("flex:1;font-size:11.5px;color:#9C160D")},F(null,"Slet alle ",V(R(S,"m.itemCount"))," punkter?")),"\n                  ",h("div",{"onClick":R(S,"m.onClearYes"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;background:#9C160D;color:#fff")},"Slet"),"\n                  ",h("div",{"onClick":R(S,"m.onClearNo"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D")},"Annuller"),"\n                "),"\n              "):null),"\n              ",h("div",{style:CS("display:flex;flex-direction:column;gap:6px")},"\n                ",M(R(S,"m.checklist"),S,"c",(S)=>["\n                  ",h("div",{style:CS("display:flex;flex-direction:column;gap:4px")},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                    ",h("div",{style:CS("width:13px;height:13px;border-radius:3px;border:1.5px solid #C9C4BA;flex:none")}),"\n                    ",h("input",{"value":DV(R(S,"c.text")),"onChange":R(S,"c.onText"),style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:6px 9px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                    ",h("div",{"onClick":R(S,"c.onLink"),"title":"Afhængig af",style:CS(("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid "+Z(R(S,"c.linkBorder"))+";border-radius:4px;background:"+Z(R(S,"c.linkBg"))+";display:flex;align-items:center;justify-content:center;color:"+Z(R(S,"c.linkColor")))),className:"fpd"},"\n                      ",h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round"},h("path",{"d":"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"}),h("path",{"d":"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"})),"\n                    "),"\n                    ",h("div",{"title":"Skift",style:CS(("position:relative;width:24px;height:24px;border-radius:4px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"c.ownerColor"))+";cursor:pointer"))},F(null,V(R(S,"c.ownerInitials")),"\n                    "),h("select",{"value":DV(R(S,"c.by")),"onChange":R(S,"c.onBy"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},M(R(S,"m.peopleOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                  "),"\n                    ",(R(S,"c.hasDue")?F(null,"\n                      ",h(window.FlowDate,{"value":DV(R(S,"c.due")),"onChange":R(S,"c.onDue"),style:CS("width:118px;flex:none;border:1px solid transparent;border-radius:3px;padding:2px 4px;font-size:11.5px;font-family:inherit;color:#231F20;background:transparent;outline:none"),className:"fpl fpi"}),"\n                    "):null),"\n                    ",(R(S,"c.noDue")?F(null,"\n                      ",h("div",{"title":"Vælg dato",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F;position:relative"),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"4","y":"5","width":"16","height":"15","rx":"2"}),h("path",{"d":"M4 10h16"}),h("path",{"d":"M9 3v4"}),h("path",{"d":"M15 3v4"})),h(window.FlowDate,{"value":DV(""),"onChange":R(S,"c.onDue"),"onClick":R(S,"m.showPicker"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")})),"\n                    "):null),"\n                    ",h("div",{"onClick":R(S,"c.onDelete"),"title":"Fjern",style:CS("cursor:pointer;color:#C9C4BA;font-size:13px;flex:none;padding:0 2px"),className:"fp4"},"✕"),"\n                  "),"\n                  ",(R(S,"c.showDep")?F(null,"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:7px;padding-left:20px")},"\n                      ",h("div",{style:CS("font-size:11px;color:#9C948B;flex:none")},"Afhængig af"),"\n                      ",h("select",{"value":DV(R(S,"c.after")),"onChange":R(S,"c.onAfter"),style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:4px 7px;font-size:11.5px;font-family:inherit;color:#4A443F;background:#FAF9F6;outline:none")},M(R(S,"c.depOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                    "),"\n                  "):null),"\n                  "),"\n                "]),"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                  ",h("div",{style:CS("width:13px;height:13px;border-radius:3px;border:1.5px dashed #C9C4BA;flex:none")}),"\n                  ",h("input",{"value":DV(R(S,"m.niText")),"onChange":R(S,"m.onNiText"),"onKeyDown":R(S,"m.onNiKey"),"placeholder":"Tilføj",style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:6px 9px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                  ",h("div",{"title":"Skift",style:CS(("position:relative;width:24px;height:24px;border-radius:4px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"m.niColor"))+";cursor:pointer"))},F(null,V(R(S,"m.niInitials")),"\n                    "),h("select",{"value":DV(R(S,"m.niBy")),"onChange":R(S,"m.onNiBy"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},M(R(S,"m.peopleOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                  "),"\n                  ",(R(S,"m.niHasDue")?F(null,"\n                    ",h(window.FlowDate,{"value":DV(R(S,"m.niDue")),"onChange":R(S,"m.onNiDue"),style:CS("width:118px;flex:none;border:1px solid transparent;border-radius:3px;padding:2px 4px;font-size:11.5px;font-family:inherit;color:#231F20;background:transparent;outline:none"),className:"fpl"}),"\n                  "):null),"\n                  ",(R(S,"m.niNoDue")?F(null,"\n                    ",h("div",{"title":"Vælg dato",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F;position:relative"),className:"fpj"},h("svg",{"width":"14","height":"14","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("rect",{"x":"4","y":"5","width":"16","height":"15","rx":"2"}),h("path",{"d":"M4 10h16"}),h("path",{"d":"M9 3v4"}),h("path",{"d":"M15 3v4"})),h(window.FlowDate,{"value":DV(""),"onChange":R(S,"m.onNiDue"),"onClick":R(S,"m.showPicker"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")})),"\n                  "):null),"\n                  ",h("div",{style:CS("width:17px;flex:none")}),"\n                "),"\n              "),"\n            "),"\n\n            ",h("div",{"onDrop":R(S,"m.onDropFiles"),"onDragOver":R(S,"m.onDragOver")},"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:9px")},"\n                ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Filer"),"\n                ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n              "),"\n              ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:8px")},"\n                ",M(R(S,"m.files"),S,"f",(S)=>["\n                  ",h("div",{"title":R(S,"f.name"),style:CS("position:relative;width:64px;height:64px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:6px;background:#FAF9F6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px")},"\n                    ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:10px;font-weight:700;color:#6E675F")},V(R(S,"f.kind"))),"\n                    ",h("div",{style:CS("font-size:10px;color:#4A443F;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")},V(R(S,"f.name"))),"\n                    ",h("div",{"onClick":R(S,"f.onDelete"),"title":"Fjern",style:CS("position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;background:#fff;border:1px solid #DFDBD3;display:flex;align-items:center;justify-content:center;font-size:9px;color:#6E675F;cursor:pointer"),className:"fpn"},"✕"),"\n                  "),"\n                "]),"\n                ",h("div",{"onClick":R(S,"m.onAttach"),"title":"Tilføj fil",style:CS("width:64px;height:64px;box-sizing:border-box;border:1px dashed #C9C4BA;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9C948B;cursor:pointer"),className:"fpj"},h("svg",{"width":"18","height":"18","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.2","strokeLinecap":"round"},h("path",{"d":"M12 5v14"}),h("path",{"d":"M5 12h14"}))),"\n              "),"\n            "),"\n          "),"\n\n          ",h("div",{style:CS("padding:20px 22px;display:flex;flex-direction:column;gap:18px;background:#FAF9F6")},"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Type"),"\n              ",h("div",{style:CS("display:flex;gap:4px")},"\n                ",M(R(S,"m.typeOpts"),S,"o",(S)=>["\n                  ",h("div",{"onClick":R(S,"o.onClick"),"title":R(S,"o.tip"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n                "]),"\n              "),"\n            "),"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Status"),"\n              ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:5px")},"\n                ",M(R(S,"m.statusOpts"),S,"p",(S)=>["\n                  ",h("div",{"onClick":R(S,"p.onClick"),style:CS(("cursor:pointer;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"p.border"))+";background:"+Z(R(S,"p.bg"))+";color:"+Z(R(S,"p.color"))))},V(R(S,"p.label"))),"\n                "]),"\n              "),"\n            "),"\n            ",h("div",{},"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:7px")},"\n                ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;flex:1")},"Område"),"\n                ",h("div",{"onClick":R(S,"m.onLbToggle"),"title":"Rediger områder",style:CS("cursor:pointer;flex:none;width:24px;height:24px;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;color:#6E675F;width:22px;height:22px"),className:"fpj"},h("svg",{"width":"13","height":"13","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","strokeWidth":"2.4","strokeLinecap":"round","strokeLinejoin":"round"},h("path",{"d":"M4 20h4L19 9l-4-4L4 16z"}))),"\n              "),"\n              ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:5px")},"\n                ",M(R(S,"m.labelOpts"),S,"l",(S)=>["\n                  ",h("div",{"onClick":R(S,"l.onClick"),style:CS(("display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11.5px;font-weight:"+Z(R(S,"l.weight"))+";padding:4px 8px;border-radius:3px;border:1px solid "+Z(R(S,"l.border"))+";background:"+Z(R(S,"l.bg"))+";color:"+Z(R(S,"l.color"))))},"\n                    ",h("div",{style:CS(("width:7px;height:7px;border-radius:2px;background:"+Z(R(S,"l.dot"))))}),F(null,V(R(S,"l.name")),"\n                  ")),"\n                "]),"\n              "),"\n              ",(R(S,"m.lbOpen")?F(null,"\n                ",h("div",{style:CS("margin-top:8px;border:1px solid #DFDBD3;border-radius:4px;background:#fff;padding:10px")},"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:8px;margin-bottom:8px")},"\n                    ",h("div",{style:CS("font-family:Archivo,sans-serif;font-size:12px;font-weight:600;flex:1")},"Område"),"\n                    ",h("div",{"onClick":R(S,"m.onLbToggle"),style:CS("cursor:pointer;color:#9C948B;font-size:13px")},"✕"),"\n                  "),"\n                  ",h("input",{"value":DV(R(S,"m.lbQ")),"onChange":R(S,"m.onLbQ"),"placeholder":"Søg områder…",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none;margin-bottom:8px"),className:"fpm"}),"\n                  ",h("div",{style:CS("display:flex;flex-direction:column;gap:4px")},"\n                    ",M(R(S,"m.lbRows"),S,"l",(S)=>["\n                      ",h("div",{style:CS("display:flex;align-items:center;gap:7px")},"\n                        ",h("div",{"onClick":R(S,"l.onToggle"),style:CS(("width:14px;height:14px;flex:none;border-radius:3px;cursor:pointer;border:1.5px solid "+Z(R(S,"l.boxBorder"))+";background:"+Z(R(S,"l.boxFill"))+";color:#fff;font-size:9.5px;display:flex;align-items:center;justify-content:center;line-height:1"))},V(R(S,"l.mark"))),"\n                        ",h("div",{"onClick":R(S,"l.onToggle"),style:CS(("flex:1;min-width:0;cursor:pointer;border-radius:3px;padding:5px 9px;font-size:12px;font-weight:600;color:#fff;background:"+Z(R(S,"l.color"))+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap"))},V(R(S,"l.name"))),"\n                        ",h("div",{"onClick":R(S,"l.onEdit"),style:CS("cursor:pointer;font-size:11px;color:#6E675F;flex:none;padding:0 2px"),className:"fp8"},"✎"),"\n                      "),"\n                    "]),"\n                  "),"\n                  ",(R(S,"m.lbEditing")?F(null,"\n                    ",h("div",{style:CS("margin-top:9px;border-top:1px solid #E9E6E0;padding-top:9px")},"\n                      ",h("div",{style:CS("font-size:11px;font-weight:600;color:#6E675F;margin-bottom:6px")},V(R(S,"m.lbEditHeading"))),"\n                      ",h("input",{"value":DV(R(S,"m.lbName")),"onChange":R(S,"m.onLbName"),"placeholder":"Navn på område",style:CS("width:100%;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                      ",h("div",{style:CS("display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:8px 0")},"\n                        ",M(R(S,"m.lbSwatches"),S,"c",(S)=>["\n                          ",h("div",{"onClick":R(S,"c.onClick"),style:CS(("height:22px;border-radius:3px;cursor:pointer;background:"+Z(R(S,"c.color"))+";box-shadow:0 0 0 2px "+Z(R(S,"c.ring"))))}),"\n                        "]),"\n                      "),"\n                      ",h("div",{style:CS("display:flex;align-items:center;gap:7px;margin-bottom:9px")},"\n                        ",h("div",{style:CS(("width:22px;height:22px;border-radius:3px;flex:none;background:"+Z(R(S,"m.lbHex"))+";border:1px solid #DFDBD3"))}),"\n                        ",h("input",{"value":DV(R(S,"m.lbHex")),"onChange":R(S,"m.onLbHex"),"placeholder":"#RRGGBB",style:CS("flex:1;min-width:0;border:1px solid #DFDBD3;border-radius:4px;padding:5px 8px;font-size:11.5px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n                      "),"\n                      ",h("div",{style:CS("display:flex;gap:6px")},"\n                        ",h("div",{"onClick":R(S,"m.onLbSave"),style:CS("cursor:pointer;flex:1;text-align:center;font-size:11.5px;font-weight:600;padding:6px;border-radius:3px;color:#fff;background:#231F20")},"Gem"),"\n                        ",h("div",{"onClick":R(S,"m.onLbCancel"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 10px;border-radius:3px;border:1px solid #DFDBD3;color:#4A443F")},"Fortryd"),"\n                        ",(R(S,"m.lbCanDelete")?F(null,"\n                          ",h("div",{"onClick":R(S,"m.onLbDelete"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 10px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D;background:#FDEFE6")},"Slet"),"\n                        "):null),"\n                      "),"\n                    "),"\n                  "):null),"\n                  ",h("div",{"onClick":R(S,"m.onLbNew"),style:CS("margin-top:9px;cursor:pointer;text-align:center;font-size:11.5px;font-weight:600;padding:7px;border-radius:3px;border:1px dashed #C9C4BA;color:#4A443F"),className:"fpd"},"Opret nyt område"),"\n                "),"\n              "):null),"\n            "),"\n            ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Ejer"),"\n              ",h("div",{"title":"Skift",style:CS(("position:relative;width:24px;height:24px;border-radius:4px;flex:none;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;color:#fff;background:"+Z(R(S,"m.ownerColor"))+";cursor:pointer"))},F(null,V(R(S,"m.ownerInitials")),"\n                    "),h("select",{"value":DV(R(S,"m.owner")),"onChange":R(S,"m.onOwner"),style:CS("position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none")},M(R(S,"m.peopleOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                  "),"\n            "),"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Medlemmer"),"\n              ",h("div",{style:CS("display:flex;gap:5px")},"\n                ",M(R(S,"m.memberOpts"),S,"p",(S)=>["\n                  ",h("div",{"onClick":R(S,"p.onClick"),"title":R(S,"p.name"),style:CS(("cursor:pointer;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:Archivo,sans-serif;font-size:9px;font-weight:600;background:"+Z(R(S,"p.avatarBg"))+";color:"+Z(R(S,"p.avatarColor"))))},V(R(S,"p.initials"))),"\n                "]),"\n              "),"\n            "),"\n            "),"\n            ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Deadline"),"\n              ",h(window.FlowDate,{"value":DV(R(S,"m.due")),"onChange":R(S,"m.onDue"),style:CS("width:100%;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:6px 7px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n            "),"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Estimat"),"\n              ",h("input",{"value":DV(R(S,"m.est")),"onChange":R(S,"m.onEst"),"placeholder":"timer",style:CS("width:100%;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n            "),"\n            "),"\n            ",(R(S,"m.isNew")?F(null,"\n            ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:end")},"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Brugt tid"),"\n              ",h("input",{"value":DV(R(S,"m.spentNow")),"onChange":R(S,"m.onSpentNow"),"placeholder":"timer",style:CS("width:100%;box-sizing:border-box;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;color:#231F20;background:#fff;outline:none"),className:"fpm"}),"\n            "),"\n            ",h("div",{style:CS("font-size:11px;color:#9C948B;line-height:1.4;padding-bottom:4px")},"Har du allerede arbejdet på den? Tiden registreres på dig i dag."),"\n            "),"\n            "):null),"\n            ",h("div",{style:CS("display:grid;grid-template-columns:150px minmax(0,1fr);column-gap:12px;align-items:start")},"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Prioritet"),"\n              ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:5px")},"\n                ",M(R(S,"m.prioOpts"),S,"p",(S)=>["\n                  ",h("div",{"onClick":R(S,"p.onClick"),style:CS(("cursor:pointer;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"p.border"))+";background:"+Z(R(S,"p.bg"))+";color:"+Z(R(S,"p.color"))))},V(R(S,"p.label"))),"\n                "]),"\n              "),"\n            "),"\n            ",h("div",{},"\n              ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F;margin-bottom:7px")},"Synlighed"),"\n              ",h("div",{style:CS("display:flex;gap:5px")},"\n                ",M(R(S,"m.visOpts"),S,"o",(S)=>["\n                  ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:11px;font-weight:600;padding:4px 9px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n                "]),"\n              "),"\n            "),"\n            "),"\n          "),"\n        "),"\n\n        ",h("div",{style:CS("border-top:1px solid #DFDBD3;padding:18px 22px;background:#fff")},"\n          ",h("div",{style:CS("display:flex;align-items:center;gap:9px;margin-bottom:11px")},"\n            ",h("div",{style:CS("font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6E675F")},"Gentagelse"),"\n            ",h("div",{style:CS("flex:1;height:1px;background:#E9E6E0")}),"\n            ",h("div",{style:CS("font-size:11.5px;color:#0031EB;font-weight:600")},V(R(S,"m.recurSummary"))),"\n          "),"\n          ",h("div",{style:CS("display:flex;flex-wrap:wrap;gap:5px")},"\n            ",M(R(S,"m.recurModes"),S,"r",(S)=>["\n              ",h("div",{"onClick":R(S,"r.onClick"),style:CS(("cursor:pointer;font-size:12px;font-weight:600;padding:5px 11px;border-radius:3px;border:1px solid "+Z(R(S,"r.border"))+";background:"+Z(R(S,"r.bg"))+";color:"+Z(R(S,"r.color"))))},V(R(S,"r.label"))),"\n            "]),"\n          "),"\n\n          ",(R(S,"m.isRec")?F(null,"\n            ",h("div",{style:CS("margin-top:13px;border:1px solid #DFDBD3;border-radius:4px;background:#FAF9F6;padding:14px;display:flex;flex-direction:column;gap:12px")},"\n              ",h("div",{style:CS("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#4A443F")},"\n                ",h("div",{},"Gentag hver"),"\n                ",h("input",{"type":"number","min":"1","value":DV(R(S,"m.every")),"onChange":R(S,"m.onEvery"),style:CS("width:62px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n                ",h("div",{},V(R(S,"m.unit"))),"\n              "),"\n\n              ",(R(S,"m.isWeek")?F(null,"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px")},"\n                  ",h("div",{style:CS("font-size:12.5px;color:#4A443F;width:66px;flex:none")},"På dagene"),"\n                  ",h("div",{style:CS("display:flex;gap:4px")},"\n                    ",M(R(S,"m.weekdays"),S,"w",(S)=>["\n                      ",h("div",{"onClick":R(S,"w.onClick"),style:CS(("cursor:pointer;width:34px;text-align:center;font-size:11.5px;font-weight:600;padding:5px 0;border-radius:3px;border:1px solid "+Z(R(S,"w.border"))+";background:"+Z(R(S,"w.bg"))+";color:"+Z(R(S,"w.color"))))},V(R(S,"w.label"))),"\n                    "]),"\n                  "),"\n                "),"\n              "):null),"\n\n              ",(R(S,"m.isMonth")?F(null,"\n                ",h("div",{style:CS("display:flex;flex-direction:column;gap:9px")},"\n                  ",h("div",{style:CS("display:flex;gap:5px")},"\n                    ",M(R(S,"m.monthDayModes"),S,"o",(S)=>["\n                      ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n                    "]),"\n                  "),"\n                  ",(R(S,"m.byDay")?F(null,"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#4A443F")},"\n                      ",h("div",{},"Den"),"\n                      ",h("input",{"type":"number","min":"1","max":"31","value":DV(R(S,"m.monthDay")),"onChange":R(S,"m.onMonthDay"),style:CS("width:62px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n                      ",h("div",{},"i måneden"),"\n                    "),"\n                  "):null),"\n                  ",(R(S,"m.byWeekday")?F(null,"\n                    ",h("div",{style:CS("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#4A443F")},"\n                      ",h("div",{},"Den"),"\n                      ",h("select",{"value":DV(R(S,"m.nth")),"onChange":R(S,"m.onNth"),style:CS("width:104px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"m.nthOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                      ",h("select",{"value":DV(R(S,"m.nthDay")),"onChange":R(S,"m.onNthDay"),style:CS("width:118px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"m.wdOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                      ",h("div",{},"i måneden"),"\n                    "),"\n                  "):null),"\n                "),"\n              "):null),"\n\n              ",(R(S,"m.isYear")?F(null,"\n                ",h("div",{style:CS("display:flex;align-items:center;gap:9px;font-size:12.5px;color:#4A443F")},"\n                  ",h("div",{},"Den"),"\n                  ",h("input",{"type":"number","min":"1","max":"31","value":DV(R(S,"m.monthDay")),"onChange":R(S,"m.onMonthDay"),style:CS("width:62px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n                  ",h("select",{"value":DV(R(S,"m.month")),"onChange":R(S,"m.onMonth"),style:CS("width:130px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")},M(R(S,"m.monthOpts"),S,"o",(S)=>[h("option",{"value":R(S,"o.id")},V(R(S,"o.name")))])),"\n                "),"\n              "):null),"\n\n              ",h("div",{style:CS("display:flex;align-items:center;gap:9px;flex-wrap:wrap")},"\n                ",h("div",{style:CS("font-size:12.5px;color:#4A443F;width:66px;flex:none")},"Slutter"),"\n                ",M(R(S,"m.endModes"),S,"o",(S)=>["\n                  ",h("div",{"onClick":R(S,"o.onClick"),style:CS(("cursor:pointer;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:3px;border:1px solid "+Z(R(S,"o.border"))+";background:"+Z(R(S,"o.bg"))+";color:"+Z(R(S,"o.color"))))},V(R(S,"o.label"))),"\n                "]),"\n                ",(R(S,"m.endIsCount")?F(null,"\n                  ",h("div",{style:CS("display:flex;align-items:center;gap:7px;font-size:12.5px;color:#4A443F")},"\n                    ",h("input",{"type":"number","min":"1","value":DV(R(S,"m.endCount")),"onChange":R(S,"m.onEndCount"),style:CS("width:62px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n                    ",h("div",{},"gange"),"\n                  "),"\n                "):null),"\n                ",(R(S,"m.endIsDate")?F(null,"\n                  ",h(window.FlowDate,{"value":DV(R(S,"m.endDate")),"onChange":R(S,"m.onEndDate"),style:CS("width:150px;border:1px solid #DFDBD3;border-radius:4px;padding:6px 8px;font-size:12.5px;font-family:inherit;color:#231F20;background:#fff;outline:none")}),"\n                "):null),"\n              "),"\n            "),"\n          "):null),"\n        "),"\n\n        "),"\n        ",h("div",{style:CS("flex:none;border-top:1px solid #DFDBD3;padding:14px 22px;display:flex;align-items:center;gap:9px;background:#FAF9F6")},"\n          ",(R(S,"m.canDelete")?F(null,"\n            ",h("div",{"onClick":R(S,"m.onAskDelete"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 12px;border-radius:4px;border:1px solid #F4C7AC;color:#9C160D;background:#fff"),className:"fpo"},"Slet opgave"),"\n          "):null),"\n          ",(R(S,"m.confirmDel")?F(null,"\n            ",h("div",{style:CS("display:flex;align-items:center;gap:9px;flex:1;border:1px solid #F4C7AC;background:#FDEFE6;border-radius:4px;padding:7px 11px")},"\n              ",h("div",{style:CS("flex:1;font-size:11.5px;color:#9C160D;line-height:1.4")},V(R(S,"m.delNote"))),"\n              ",h("div",{"onClick":R(S,"m.onDelete"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:3px;background:#9C160D;color:#fff")},"Slet permanent"),"\n              ",h("div",{"onClick":R(S,"m.onCancelDelete"),style:CS("cursor:pointer;font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:3px;border:1px solid #F4C7AC;color:#9C160D")},"Fortryd"),"\n            "),"\n          "):null),"\n          ",h("div",{style:CS("flex:1")}),"\n          ",h("div",{"onClick":R(S,"m.onCancel"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 14px;border-radius:4px;border:1px solid #DFDBD3;color:#4A443F;background:#fff"),className:"fp3"},"Annullér"),"\n          ",h("div",{"onClick":R(S,"m.onSave"),style:CS("cursor:pointer;font-size:12.5px;font-weight:600;padding:9px 18px;border-radius:4px;color:#fff;background:#231F20"),className:"fp5"},V(R(S,"m.saveLabel"))),"\n        "),"\n      "),"\n    "),"\n  "):null),"\n\n  ",(R(S,"toast")?F(null,"\n    ",h("div",{style:CS("position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:120;animation:toastIn .22s ease-out")},"\n      ",h("div",{style:CS("background:#231F20;color:#FAF9F6;border-radius:4px;padding:12px 16px;display:flex;align-items:center;gap:11px;box-shadow:0 8px 26px rgba(16,16,20,.24);max-width:620px")},"\n        ",h("div",{style:CS("width:7px;height:7px;border-radius:50%;background:#5BD1A0;flex:none")}),"\n        ",h("div",{style:CS("font-size:13px;line-height:1.4")},V(R(S,"toast"))),"\n        ",(R(S,"canUndo")?F(null,"\n          ",h("div",{"onClick":R(S,"onUndo"),style:CS("cursor:pointer;flex:none;font-size:12px;font-weight:600;color:#9FC4DB;border-left:1px solid #3D3735;padding-left:12px"),className:"fp1"},"Fortryd"),"\n        "):null),"\n      "),"\n    "),"\n  "):null))); }
window.FlowRender = { render, css: ".fp0:hover{background:#332E2E !important}\n.fp1:hover{color:#fff !important}\n.fp2:hover{border-color:#C9C4BA !important;color:#231F20 !important}\n.fp3:hover{border-color:#C9C4BA !important}\n.fp4:hover{color:#9C160D !important}\n.fp5:hover{background:#3D3735 !important}\n.fp6:hover{color:#123C2F !important}\n.fp7:hover{background:#F7F5F1 !important}\n.fp8:hover{color:#0031EB !important}\n.fp9:hover{border-color:#0031EB !important}\n.fpa:focus{border-style:solid !important;border-color:#0031EB !important;background:#fff !important}\n.fpb:hover{background:#E9E6E0 !important}\n.fpc:hover{background:#FAF9F6 !important}\n.fpd:hover{border-color:#0031EB !important;color:#0031EB !important}\n.fpe:hover{background:#F3F1EC !important}\n.fpf:hover{border-color:#C9C4BA !important;box-shadow:0 2px 8px rgba(16,16,20,.09) !important}\n.fpg:hover{border-color:#C9C4BA !important;background:#F7F5F1 !important}\n.fph:hover{text-decoration:underline !important}\n.fpi:focus{border-color:#0031EB !important;background:#fff !important}\n.fpj:hover{border-color:#0031EB !important;color:#0031EB !important;background:#F0F4FE !important}\n.fpk:hover{border-color:#9C160D !important;color:#9C160D !important;background:#FDEFE6 !important}\n.fpl:hover{background:#EFECE6 !important}\n.fpm:focus{border-color:#0031EB !important}\n.fpn:hover{color:#9C160D !important;border-color:#9C160D !important}\n.fpo:hover{background:#FDEFE6 !important}" };
})();

;
(function(){
const MON = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
const MONTH = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
const isoOf = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
let TODAY = isoOf(new Date());
const THIS_YEAR = () => +TODAY.slice(0, 4);
const addDays = (iso, n) => { const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + n); return isoOf(x); };
const STATUS = {
  ide:      { label: 'Idé',       color: '#4A443F', bg: '#E9E6E0', dot: '#A9927D' },
  pipeline: { label: 'Pipeline',  color: '#123C2F', bg: '#EDF1FD', dot: '#6E9BD6' },
  gang:     { label: 'I gang',    color: '#123C2F', bg: '#E7ECFE', dot: '#0031EB' },
  pplads:   { label: 'P-plads',   color: '#9C160D', bg: '#FDEFE6', dot: '#ED571C' },
  review:   { label: 'Til review',color: '#1C6FA8', bg: '#E8F3FB', dot: '#489FDF' },
  faerdig:  { label: 'Færdig',    color: '#123C2F', bg: '#E4EBE7', dot: '#123C2F' }
};
const ORDER = ['ide','pipeline','gang','pplads','review','faerdig'];
const PRIO = {
  hoej:    { label: 'Høj',     color: '#ED571C', rank: 1 },
  normal:  { label: 'Normal',  color: '#4A443F', rank: 2 },
  lav:     { label: 'Lav',     color: '#9C948B', rank: 3 }
};
const SWATCH = ['#D92B2B','#E8720C','#E8B70C','#2E9E4F','#3FA9DE','#2647B5','#7B3FD4','#E0479E','#8C1F3D','#3FC6A3'];
const LABELS = [
  { id: 'l1', name: 'Kampagne',   color: '#E8720C' },
  { id: 'l2', name: 'Webshop',    color: '#2647B5' },
  { id: 'l3', name: 'Print',      color: '#7B3FD4' },
  { id: 'l4', name: 'SEO',        color: '#3FC6A3' },
  { id: 'l5', name: 'Haster',     color: '#D92B2B' },
  { id: 'l6', name: 'Butik',      color: '#2E9E4F' },
  { id: 'l7', name: 'Afventer 3.part', color: '#8C1F3D' },
  { id: 'l8', name: 'Content',    color: '#E0479E' },
  { id: 'l9', name: 'AFV',        color: '#7B3FD4' }
];
const WD = ['Sø','Ma','Ti','On','To','Fr','Lø'];
const WDLONG = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
const NTH = [['1','første'],['2','anden'],['3','tredje'],['4','fjerde'],['-1','sidste']];
const d2 = n => (n < 10 ? '0' + n : '' + n);
const parse = s => new Date(s + 'T00:00:00');
const dayDiff = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
const fmt = s => { const x = parse(s); return x.getDate() + '. ' + MON[x.getMonth()]; };
const num = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const hrs = n => num(n) + ' t';
const TEAMS = () => !!((window.FLOW_CONFIG || {}).teamsWebhookUrl);
const VIA = () => TEAMS() ? 'i appen og på Teams' : 'i appen';
const WDSHORT = ['søn.','man.','tir.','ons.','tor.','fre.','lør.'];
const WH = (x) => x ? (x.ts ? relTime(x.ts) : (x.when || x.time || '')) : '';
function relTime(ts) {
  if (!ts) return '';
  if (!/^\d{4}-\d\d-\d\dT/.test(ts)) return ts;
  const x = new Date(ts), now = new Date(), day = isoOf(x), hm = d2(x.getHours()) + ':' + d2(x.getMinutes());
  const diffMin = (now - x) / 60000;
  if (diffMin < 1) return 'nu';
  if (diffMin < 60) return Math.floor(diffMin) + ' min. siden';
  const dd = dayDiff(TODAY, day);
  if (dd === 0) return 'i dag ' + hm;
  if (dd === 1) return 'i går ' + hm;
  if (dd < 7) return WDSHORT[x.getDay()] + ' ' + hm;
  return fmt(day);
}
// Next date for a recurrence rule, strictly after `fromIso`.
function nextRecurDate(r, fromIso) {
  if (!r || r.mode === 'none') return null;
  const n = Math.max(1, parseInt(r.every, 10) || 1);
  const from = parse(fromIso);
  if (r.mode === 'day') return addDays(fromIso, n);
  if (r.mode === 'week') {
    const wds = (r.weekdays && r.weekdays.length ? r.weekdays : [from.getDay()]).slice().sort();
    const monOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const base = monOf(from);
    for (let i = 1; i <= 7 * n * 2 + 7; i++) {
      const c = new Date(from); c.setDate(c.getDate() + i);
      const weeks = Math.round((monOf(c) - base) / (7 * 86400000));
      if (weeks % n === 0 && wds.indexOf(c.getDay()) >= 0) return isoOf(c);
    }
    return addDays(fromIso, 7 * n);
  }
  const nthWeekday = (y, m, nth, wd) => {
    if (String(nth) === '-1') { const last = new Date(y, m + 1, 0); while (last.getDay() !== wd) last.setDate(last.getDate() - 1); return last; }
    const d = new Date(y, m, 1); while (d.getDay() !== wd) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * ((parseInt(nth, 10) || 1) - 1));
    return d.getMonth() === m ? d : null;
  };
  const clampDay = (y, m, day) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  if (r.mode === 'month') {
    for (let k = 1; k <= 24; k++) {
      const y = from.getFullYear(), m = from.getMonth() + (k - 1) + (r.dayMode === 'dag' ? 0 : 0);
      const cands = [];
      for (const kk of [k - 1, k]) {
        const mm = from.getMonth() + kk * n; const yy = y + Math.floor(mm / 12), m2 = ((mm % 12) + 12) % 12;
        const c = r.dayMode === 'dag' ? clampDay(yy, m2, parseInt(r.monthDay, 10) || 1) : nthWeekday(yy, m2, r.nth, parseInt(r.nthDay, 10) || 0);
        if (c && c > from) cands.push(c);
      }
      if (cands.length) return isoOf(cands.sort((a, b) => a - b)[0]);
    }
    return null;
  }
  if (r.mode === 'year') {
    for (let k = 0; k <= 2; k++) {
      const c = clampDay(from.getFullYear() + k * n, (parseInt(r.month, 10) || 1) - 1, parseInt(r.monthDay, 10) || 1);
      if (c > from) return isoOf(c);
    }
    return null;
  }
  return null;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.fileRef = React.createRef();
    this.fileTarget = 'draft';
    const D = props.data;
    this.state = {
      view: 'dag', me: props.me, sel: null, projFilter: null, sortBy: 'prio', onlyMine: false, toast: null, draft: null, dragOver: false, warn: null,
      labelDefs: D.labelDefs, labelsExpanded: false,
      noteDraft: '', cmt: '', reply: '', replyTo: null,
      stickies: D.stickies,
      batch: { open: false, tab: 'paste', raw: '', hasHeader: true, map: null,
        shared: { owner: '', due: '', prio: '', members: [] }, picks: [] },
      templates: D.templates,
      lbUI: { open: false, q: '', editId: null, name: '', color: SWATCH[0] },
      prUI: { open: false, editId: null, name: '', color: SWATCH[0] },
      timerTask: null, timerStart: null, timeScope: 'me', tick: 0,
      group: 'maaned', collapsed: {}, statusOff: { ide: 1, pipeline: 1, pplads: 1, faerdig: 1 },
      people: D.people,
      projects: D.projects,
      tasks: D.tasks, notes: D.notes, entries: D.entries
    };
  }

  seed() { return []; }
  componentDidMount() {
    this.onKey = (e) => { const k = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); this.openSearch(); return; }
      if (k === 'escape' && this.state.srchUI) { this.setState({ srchUI: null }); return; }
      if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); this.undo(); } };
    window.addEventListener('keydown', this.onKey);
    this.iv = setInterval(() => { if (this.state.timerTask && !this.autoStop()) this.setState({ tick: Date.now() }); }, 1000);
    this.iv2 = setInterval(() => { const t = isoOf(new Date()); if (t !== TODAY) { TODAY = t; this.staleCheck(); } this.setState({ tick: Date.now() }); }, 60000);
    this.st0 = setTimeout(() => { if (this.state.timerTask) this.autoStop(); this.staleCheck(); }, 2500); }
  componentWillUnmount() { window.removeEventListener('keydown', this.onKey); clearInterval(this.iv); clearInterval(this.iv2); clearTimeout(this.st0); if (this.tt) clearTimeout(this.tt); }

  snap(label) {
    const s = this.state;
    this.hist = (this.hist || []).concat([{ label,
      tasks: s.tasks, entries: s.entries, notes: s.notes, stickies: s.stickies,
      projects: s.projects, labelDefs: s.labelDefs }]).slice(-25);
  }
  undo() {
    const last = (this.hist || []).pop();
    if (!last) { this.flash('Der er ikke noget at fortryde.'); return; }
    const selOk = this.state.sel && last.tasks.some(t => t.id === this.state.sel);
    this.setState({ tasks: last.tasks, entries: last.entries, notes: last.notes, stickies: last.stickies,
      projects: last.projects, labelDefs: last.labelDefs, draft: null,
      sel: selOk ? this.state.sel : null, trail: selOk ? this.state.trail : [],
      timerTask: this.state.timerTask && last.tasks.some(t => t.id === this.state.timerTask) ? this.state.timerTask : null });
    this.flash('Fortrudt: ' + last.label);
  }

  flash(m) { if (this.tt) clearTimeout(this.tt); this.setState({ toast: m }); this.tt = setTimeout(() => this.setState({ toast: null }), 5600); }
  T(id) { return this.state.tasks.find(x => x.id === id); }
  P(id) { return this.state.projects.find(x => x.id === id) || { id, name: 'Uden område', color: '#9C948B' }; }
  U(id) { return this.state.people.find(x => x.id === id) || { id, name: 'Tidligere medlem', initials: '?', color: '#9C948B' }; }

  liveSpent(t) { return this.state.timerTask === t.id ? t.spent + (Date.now() - this.state.timerStart) / 3600000 : t.spent; }

  timerCutoff(start) {
    const d = new Date(start), c = new Date(start);
    c.setHours(18, 0, 0, 0);
    if (d >= c) c.setHours(23, 59, 59, 0);
    return c.getTime();
  }
  closeTimer(end) {
    const s = this.state; if (!s.timerTask) return { tasks: s.tasks, entries: s.entries };
    const add = Math.max(0, (Math.min(end, this.timerCutoff(s.timerStart)) - s.timerStart) / 3600000);
    const sd = new Date(s.timerStart), iso = sd.getFullYear() + '-' + d2(sd.getMonth() + 1) + '-' + d2(sd.getDate());
    return { tasks: s.tasks.map(t => t.id === s.timerTask ? Object.assign({}, t, { spent: t.spent + add }) : t),
      entries: add >= 1 / 60 ? s.entries.concat([[s.timerTask, s.me, iso, Math.round(add * 100) / 100, 'timer']]) : s.entries };
  }
  toggleTimer(id) {
    const s = this.state;
    if (s.timerTask === id) {
      const r = this.closeTimer(Date.now());
      this.setState({ timerTask: null, timerStart: null, tasks: r.tasks, entries: r.entries });
      this.flash('Tid registreret på “' + this.T(id).title + '”.');
    } else {
      const r = this.closeTimer(Date.now());
      const tasks = r.tasks.map(t => t.id === id && !t.ongoing && (t.status === 'pipeline' || t.status === 'ide') ? Object.assign({}, t, { status: 'gang' }) : t);
      this.setState({ tasks, entries: r.entries, timerTask: id, timerStart: Date.now() });
    }
  }
  autoStop() {
    const s = this.state;
    if (!s.timerTask || Date.now() < this.timerCutoff(s.timerStart)) return false;
    const title = this.T(s.timerTask) ? this.T(s.timerTask).title : '';
    const r = this.closeTimer(Date.now());
    this.setState({ timerTask: null, timerStart: null, tasks: r.tasks, entries: r.entries });
    this.flash('Timeren på “' + title + '” blev stoppet automatisk kl. 18.');
    return true;
  }

  setStatus(id, st) {
    this.snap('statusskift på “' + this.T(id).title + '”');
    const prevT = this.T(id);
    let tasks = this.state.tasks.map(t => t.id === id ? Object.assign({}, t, { status: st, dirty: true,
      checklist: st === 'faerdig' ? t.checklist.map(c => c.done ? c : Object.assign({}, c, { done: true })) : t.checklist,
      waiting: st === 'pplads' ? (t.waiting || 'kollega') : null,
      doneAt: st === 'faerdig' ? (t.doneAt || TODAY) : null,
      parkedAt: st === 'pplads' ? (t.status === 'pplads' ? (t.parkedAt || TODAY) : TODAY) : null,
      log: this.addLog(t, 'Flyttede opgaven til ' + STATUS[st].label) }) : t);
    let nextOcc = null;
    if (st === 'faerdig' && prevT && prevT.status !== 'faerdig' && prevT.recur && prevT.recur.mode !== 'none' && !tasks.some(x => x.recurFrom === id)) {
      nextOcc = this.nextOccurrence(prevT);
      if (nextOcc) tasks = tasks.concat([nextOcc]);
    }
    this.setState({ tasks });
    if (st === 'faerdig') this.releaseNext(id, tasks, nextOcc);
  }
  setPrio(id, p) { this.snap('prioritet på “' + this.T(id).title + '”'); this.setState({ tasks: this.state.tasks.map(t => t.id === id ? Object.assign({}, t, { prio: p, dirty: true }) : t) }); }
  addLink(taskId, url) {
    let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (err) {}
    const f = { name: host, url, kind: 'LINK', by: this.state.me, when: 'nu', ts: new Date().toISOString(), size: '' };
    this.setState({ tasks: this.state.tasks.map(t => t.id === taskId
      ? Object.assign({}, t, { files: t.files.concat([f]), dirty: true }) : t) });
    this.flash('Linket til ' + host + ' er vedhæftet.');
  }
  onPasteTask(taskId, e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const txt = (e.clipboardData && e.clipboardData.getData('text') || '').trim();
    if (/^https?:\/\/\S+$/i.test(txt)) { e.preventDefault(); this.addLink(taskId, txt); }
  }

  logTime(taskId) {
    this.snap('tidsregistrering');
    const f = this.state.logForm || {};
    const hrsN = parseFloat(String(f.hours || '').replace(',', '.'));
    if (!hrsN || hrsN <= 0) { this.flash('Skriv hvor mange timer du vil registrere.'); return; }
    const date = f.date || TODAY;
    this.setState({ entries: this.state.entries.concat([[taskId, this.state.me, date, hrsN]]),
      tasks: this.state.tasks.map(t => t.id === taskId ? Object.assign({}, t, { spent: t.spent + hrsN, dirty: true }) : t),
      logForm: null });
    this.flash(num(hrsN) + ' t registreret på “' + this.T(taskId).title + '” den ' + fmt(date) + '.');
  }
  delEntry(i) {
    this.snap('slettet postering');
    const e = this.state.entries[i];
    this.setState({ entries: this.state.entries.filter((x, j) => j !== i),
      tasks: this.state.tasks.map(t => t.id === e[0] ? Object.assign({}, t, { spent: Math.max(0, t.spent - e[3]) }) : t) });
    this.flash('Posteringen på ' + num(e[3]) + ' t er slettet.');
  }

  addNote(text) {
    if (!text.trim()) return;
    this.snap('ny note');
    this.setState({ stickies: [{ id: 'st' + Date.now(), by: this.state.me, text: text.trim(), shared: false, when: 'nu', ts: new Date().toISOString() }]
      .concat(this.state.stickies), noteDraft: '' });
  }
  shareNote(id) {
    const n = this.state.stickies.filter(x => x.id === id)[0];
    this.setState({ stickies: this.state.stickies.map(x => x.id === id ? Object.assign({}, x, { shared: !x.shared }) : x) });
    this.flash(n.shared ? 'Noten er privat igen.' : 'Noten er delt med ' + this.state.people.filter(p => p.id !== this.state.me).map(p => p.name).join(', ').replace(/, ([^,]*)$/, ' og $1') + '.');
  }
  delNote(id) { this.snap('slettet note'); this.setState({ stickies: this.state.stickies.filter(x => x.id !== id) }); }

  mentions(text) {
    return this.state.people.filter(u => new RegExp('@' + u.name, 'i').test(text)).map(u => u.id);
  }
  notifyMentions(taskId, text, extra) {
    const t = this.T(taskId), from = this.U(this.state.me);
    if (t && t.private) return null;
    const to = this.mentions(text).filter(id => id !== this.state.me);
    if (!to.length) return null;
    const notes = to.map((id, i) => ({ id: 'cm' + Date.now() + i, to: id, tag: 'OMTALE', kind: 'mention', task: taskId,
      title: from.name + ' nævnte dig i ' + t.title, body: '“' + text.trim() + '”', time: 'nu', ts: new Date().toISOString(), read: false, channel: 'Teams · Webshop' }));
    this.setState({ notes: notes.concat(this.state.notes) });
    return to.map(id => this.U(id).name).join(' og ');
  }
  addComment(taskId, text) {
    if (!text.trim()) return;
    this.snap('kommentar');
    const t = this.T(taskId);
    const c = { id: 'cm' + Date.now(), by: this.state.me, text: text.trim(), when: 'nu', ts: new Date().toISOString(), replies: [] };
    this.setState({ tasks: this.state.tasks.map(x => x.id === taskId
      ? Object.assign({}, x, { comments: (x.comments || []).concat([c]) }) : x), cmt: '' });
    const who = this.notifyMentions(taskId, text);
    this.flash(who ? who + ' fik besked ' + VIA() + ' om din kommentar.' : 'Kommentar tilføjet.');
  }
  addReply(taskId, threadId, text) {
    if (!text.trim()) return;
    this.setState({ tasks: this.state.tasks.map(x => x.id !== taskId ? x
      : Object.assign({}, x, { comments: (x.comments || []).map(c => c.id !== threadId ? c
        : Object.assign({}, c, { replies: c.replies.concat([{ id: 'r' + Date.now(), by: this.state.me, text: text.trim(), when: 'nu', ts: new Date().toISOString() }]) })) })),
      replyTo: null, reply: '' });
    const who = this.notifyMentions(taskId, text);
    if (who) this.flash(who + ' fik besked ' + VIA() + ' om dit svar.');
  }
  patch(id, p) { this.snap('ændring af “' + this.T(id).title + '”');
    const t0 = this.T(id); let log = null;
    if ('due' in p && p.due !== t0.due) log = p.due ? 'Satte deadline til ' + fmt(p.due) : 'Fjernede deadline';
    else if ('owner' in p && p.owner !== t0.owner && this.U(p.owner)) log = 'Gav opgaven til ' + this.U(p.owner).name;
    else if ('prio' in p && p.prio !== t0.prio) log = 'Satte prioritet til ' + PRIO[p.prio].label;
    this.setState({ tasks: this.state.tasks.map(t => t.id === id ? Object.assign({}, t, p, { dirty: true }, log ? { log: this.addLog(t, log) } : {}) : t) }); }
  addLog(t, text) { return [{ by: this.state.me, text, ts: new Date().toISOString() }].concat(t.log || []).slice(0, 40); }
  setOngoing(id, on) {
    const t = this.T(id); if (!t) return;
    this.patch(id, { ongoing: !!on });
    this.setState({ tasks: this.state.tasks.map(x => x.id !== id ? x : Object.assign({}, x, { log: this.addLog(x, on ? 'Flyttede til Løbende arbejde' : 'Flyttede tilbage til opgaverne') })) });
    this.flash(on ? '“' + t.title + '” er flyttet til Løbende arbejde. Du finder den i sidebaren og øverst på Min dag.' : '“' + t.title + '” er tilbage blandt opgaverne.');
  }
  hiddenFor(t) { return !!(t && t.private && t.owner !== this.state.me); }
  setPrivate(id, on) {
    const t = this.T(id); if (!t || t.owner !== this.state.me) return;
    this.patch(id, Object.assign({ private: !!on }, on ? { members: [t.owner] } : {}));
    this.setState({ tasks: this.state.tasks.map(x => x.id !== id ? x : Object.assign({}, x, { log: this.addLog(x, on ? 'Gjorde opgaven privat' : 'Delte opgaven med teamet') })) });
    this.flash(on ? '“' + t.title + '” er nu privat. Kun du kan se den.' : '“' + t.title + '” er synlig for teamet igen.');
  }
  archived(t) { return !!t.archivedAt || (t.status === 'faerdig' && t.doneAt && dayDiff(TODAY, t.doneAt) > 30); }
  toggleArchive(id) {
    if (!this.archived(this.T(id)) && this.state.timerTask === id) this.toggleTimer(id);
    const t = this.T(id), was = this.archived(t);
    this.snap((was ? 'hentet fra arkiv: “' : 'arkivering af “') + t.title + '”');
    this.setState({ tasks: this.state.tasks.map(x => x.id !== id ? x : Object.assign({}, x, was
        ? { archivedAt: null, doneAt: x.status === 'faerdig' ? TODAY : x.doneAt, log: this.addLog(x, 'Hentede opgaven fra arkivet') }
        : { archivedAt: TODAY, log: this.addLog(x, 'Arkiverede opgaven') })),
      sel: was ? this.state.sel : null, trail: was ? this.state.trail : [] });
    this.flash(was ? '“' + t.title + '” er hentet fra arkivet.' : '“' + t.title + '” er arkiveret. Du finder den med Søg.');
  }
  archivedCount() { return this.state.tasks.filter(t => this.archived(t)).length; }
  nextOccurrence(t) {
    const r = t.recur, anchor = t.due || t.start || TODAY;
    let nd = nextRecurDate(r, anchor), guard = 0;
    while (nd && nd <= TODAY && guard++ < 800) nd = nextRecurDate(r, nd);
    if (!nd) return null;
    const count = (t.recurCount || 1) + 1;
    if (r.endMode === 'count' && count > (parseInt(r.endCount, 10) || 0)) return null;
    if (r.endMode === 'date' && r.endDate && nd > r.endDate) return null;
    const shift = dayDiff(nd, anchor);
    const id = 'o' + Date.now();
    return Object.assign({}, t, { id, status: 'pipeline', due: t.due ? nd : null, start: t.start ? addDays(t.start, shift) : (t.due ? null : nd),
      checklist: (t.checklist || []).map((c, j) => Object.assign({}, c, { id: 'c' + Date.now() + '-' + j, done: false, due: c.due ? addDays(c.due, shift) : null })),
      comments: [], files: (t.files || []).filter(f => f.kind === 'LINK'), deps: [], waiting: null, doneAt: null, parkedAt: null, planned: null, spent: 0,
      recurFrom: t.id, recurCount: count, log: [{ by: this.state.me, text: 'Oprettet automatisk fra gentagelse', ts: new Date().toISOString() }], dirty: false });
  }
  staleCheck() {
    const me = this.state.me, now = new Date().toISOString(); const add = [];
    this.state.tasks.forEach(t => {
      if (t.status !== 'pplads' || t.owner !== me) return;
      const since = t.parkedAt || TODAY, days = dayDiff(TODAY, since);
      if (days < 3) return;
      const last = this.state.notes.filter(n => n.kind === 'stale' && n.task === t.id && n.to === me).map(n => n.day || '').sort().pop();
      if (last && dayDiff(TODAY, last) < 3) return;
      const esc = days >= 10;
      add.push({ id: 'st' + Date.now() + add.length, to: me, tag: esc ? 'OVER TID' : 'P-PLADS', kind: 'stale', task: t.id, day: TODAY,
        title: t.title + ' står stille', body: 'Har ligget på P-pladsen i ' + days + ' dage. Sæt ny dato, eller flyt den tilbage til Pipeline.',
        time: 'nu', ts: new Date().toISOString(), read: false, channel: esc ? 'Teams · Webshop' : null });
    });
    if (add.length) this.setState({ notes: add.concat(this.state.notes) });
  }
  toggleMember(id, uid) {
    const t = this.T(id), on = t.members.indexOf(uid) >= 0;
    if (on && uid === t.owner) {
      // Ejeren kan fjerne sig selv: opgaven overdrages til det næste medlem
      const rest = t.members.filter(x => x !== uid);
      if (!rest.length) { this.flash('Tilføj først den, der skal udføre opgaven, som medlem.'); return; }
      const to = rest[0];
      this.patch(id, { members: rest, owner: to,
        checklist: (t.checklist || []).map(c => c.by === uid ? Object.assign({}, c, { by: to }) : c) });
      this.flash('“' + t.title + '” er overdraget til ' + this.U(to).name + '.');
      return;
    }
    this.patch(id, { members: on ? t.members.filter(x => x !== uid) : t.members.concat([uid]) });
  }
  // Område: task.project = hovedområde, task.labels = ekstra områder
  areasOf(t) { return [t.project].concat((t.labels || []).filter(x => x !== t.project)); }
  nextAreas(cur, pid) {
    const on = cur.indexOf(pid) >= 0;
    let next = on ? cur.filter(x => x !== pid) : cur.concat([pid]);
    if (!next.length) next = [(this.state.projects.find(p => /øvrig/i.test(p.name)) || this.state.projects[0]).id];
    return { project: next[0], labels: next.slice(1) };
  }
  toggleLabelOn(id, lid) {
    const t = this.T(id);
    this.patch(id, this.nextAreas(this.areasOf(t), lid));
  }
  toggleDraftArea(pid) { const d = this.state.draft; const cur = [d.project].concat((d.labels || []).filter(x => x !== d.project)).filter(Boolean);
    if (cur.length === 1 && cur[0] === pid) { this.dset({ project: '', labels: [] }); return; }
    this.dset(this.nextAreas(cur, pid)); }
  inArea(t, pid) { return t.project === pid || (t.labels || []).indexOf(pid) >= 0; }
  initialsFor(name) {
    const p = name.trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
  }
  savePerson() {
    const u = this.state.pplUI || {}, name = (u.name || '').trim();
    if (!name) { this.flash('Skriv et navn.'); return; }
    this.snap('ændring af team');
    if (u.editId) {
      this.setState({ people: this.state.people.map(p => p.id === u.editId
        ? Object.assign({}, p, { name, email: (u.email || '').trim().toLowerCase(), color: u.color, initials: name === p.name && p.initials ? p.initials : this.initialsFor(name) }) : p),
        pplUI: { open: true } });
    } else {
      const id = 'u' + Date.now();
      this.setState({ people: this.state.people.concat([{ id, name, email: (u.email || '').trim().toLowerCase(), color: u.color || SWATCH[0], initials: this.initialsFor(name) }]),
        pplUI: { open: true } });
    }
    this.flash('Teamet er opdateret.');
  }
  sendInvite(p) {
    if (!p.email) { this.flash('Tilføj en e-mail på ' + p.name + ' først.'); return; }
    this.flash('Laver invitation til ' + p.name + '…');
    Promise.resolve(this.props.invite(p)).then((r) => this.flash(r && r.teams
        ? p.name + ' har fået invitationen i Teams.' + (r.copied ? ' Linket er også kopieret.' : '')
        : (r && r.copied ? 'Linket til ' + p.name + ' er kopieret. Send det i Teams eller mail.' : 'Invitationen er oprettet.')))
      .catch((e) => this.flash('Invitationen kunne ikke sendes: ' + ((e && e.message) || e)));
  }
  approveAccess(a, link) {
    this.snap('godkendelse af ' + (a.name || a.email));
    let people = this.state.people, pid = link;
    if (link === 'new' || !people.some(p => p.id === link)) {
      const name = (a.name || a.email.split('@')[0]).trim();
      const used = people.map(p => p.color);
      pid = 'u' + Date.now();
      people = people.concat([{ id: pid, name, email: a.email, uid: a.uid, initials: this.initialsFor(name),
        color: SWATCH.find(c => used.indexOf(c) < 0) || SWATCH[0] }]);
    } else {
      people = people.map(p => p.id === link ? Object.assign({}, p, { uid: a.uid, email: a.email }) : p);
    }
    this.setState({ people });
    this.props.setAccess(a.uid, { status: 'approved', person: pid, approvedBy: this.state.me, approvedAt: new Date().toISOString() });
    this.flash((a.name || a.email) + ' er godkendt og kan nu logge ind.');
  }
  delPerson(id) {
    const n = this.state.tasks.filter(t => t.owner === id).length;
    if (n) { this.flash('Personen ejer ' + n + ' opgaver. Flyt dem først.'); return; }
    if (this.state.people.length < 2) { this.flash('Der skal være mindst én person.'); return; }
    if (id === this.state.me) { this.flash('Du kan ikke slette dig selv.'); return; }
    this.snap('slettet person');
    const gone = this.state.people.find(p => p.id === id);
    if (gone && gone.uid && this.props.setAccess) this.props.setAccess(gone.uid, { status: 'revoked' });
    this.setState({ people: this.state.people.filter(p => p.id !== id),
      me: this.state.me === id ? this.state.people.filter(p => p.id !== id)[0].id : this.state.me,
      pplUI: { open: true } });
  }
  promoteItem(id, i) {
    const t = this.T(id), it = t.checklist[i];
    this.snap('punkt gjort til opgave');
    const nid = 'sub' + Date.now();
    const task = { id: nid, title: it.text, desc: '', project: t.project, owner: it.by, members: [it.by],
      labels: (t.labels || []).slice(), status: 'gang', prio: t.prio, start: null, due: it.due || t.due,
      est: 0, spent: 0, checklist: [], deps: [], recur: null, recurring: null, waiting: null, files: [],
      planned: null, parent: t.id };
    this.setState({ tasks: this.state.tasks.map(x => x.id === id
      ? Object.assign({}, x, { checklist: x.checklist.filter((c, j) => j !== i) }) : x).concat([task]) });
    this.flash('“' + it.text + '” er nu en opgave under “' + t.title + '”.');
  }
  patchItem(id, i, p) {
    const t = this.T(id);
    this.patch(id, { checklist: t.checklist.map((c, j) => j === i ? Object.assign({}, c, p) : c) });
  }
  addItemTo(id, text) {
    if (!text.trim()) return;
    const t = this.T(id);
    this.patch(id, { checklist: t.checklist.concat([{ id: 'c' + Date.now(), text: text.trim(), done: false, by: t.owner, due: null, after: null }]) });
  }
  publish(id) {
    this.setState({ tasks: this.state.tasks.map(t => t.id === id ? Object.assign({}, t, { dirty: false }) : t) });
    this.flash('Ændringerne på “' + this.T(id).title + '” er publiceret til teamet.');
  }

  releaseNext(id, tasksIn, nextOcc) {
    const tasks = tasksIn || this.state.tasks;
    const next = tasks.filter(t => t.deps.indexOf(id) >= 0 && t.status !== 'faerdig');
    if (!next.length) { this.flash('“' + this.T(id).title + '” er markeret færdig' + (nextOcc ? '. Næste gang er oprettet til ' + fmt(nextOcc.due || nextOcc.start) + '.' : ' og arkiveres om 30 dage.')); return; }
    const upd = tasks.map(t => next.indexOf(t) >= 0 ? Object.assign({}, t, { status: 'pipeline', waiting: null }) : t);
    const notes = next.map((t, i) => ({ id: 'a' + Date.now() + i, to: t.owner, tag: 'KLAR TIL DIG', kind: 'handoff', task: t.id,
      title: t.title + ' er klar til dig',
      body: this.U(this.T(id).owner).name + ' afsluttede ' + (this.T(id).private && t.owner !== this.T(id).owner ? 'en privat opgave' : '“' + this.T(id).title + '”') + '. Opgaven er ikke længere blokeret.',
      time: 'nu', ts: new Date().toISOString(), read: false, channel: 'Teams · Webshop' }));
    this.setState({ tasks: upd, notes: notes.concat(this.state.notes) });
    const who = next.map(t => this.U(t.owner).name).filter((v, i, a) => a.indexOf(v) === i).join(' og ');
    this.flash('Færdig. ' + who + ' fik besked ' + VIA() + ' om at “' + next[0].title + '” nu er klar.');
  }

  blocker(t, it) {
    if (!it.after) return null;
    const b = t.checklist.filter(x => x.id === it.after)[0];
    return b && !b.done ? b : null;
  }

  toggleCheck(taskId, idx, force) {
    const t = this.T(taskId), it = t.checklist[idx];
    this.snap('checklistepunkt på “' + t.title + '”');
    const b = this.blocker(t, it);
    if (!it.done && b && !force) { this.setState({ warn: taskId + ':' + idx }); return; }
    const nowDone = !it.done;
    const tasks = this.state.tasks.map(x => x.id !== taskId ? x
      : Object.assign({}, x, { dirty: true, checklist: x.checklist.map((c, i) => i === idx ? Object.assign({}, c, { done: nowDone }) : c) }));
    const st = { tasks, warn: null };
    if (nowDone) {
      const next = t.checklist.filter(x => x.after === it.id && !x.done);
      const actor = this.U(this.state.me);
      const notes = next.filter(x => x.by !== this.state.me).map((x, i) => ({
        id: 'ck' + Date.now() + i, to: x.by, tag: 'KLAR TIL DIG', kind: 'handoff', task: taskId,
        title: x.text + ' er klar til dig',
        body: actor.name + ' hakkede “' + it.text + '” af på “' + t.title + '”. Dit punkt er ikke længere blokeret.',
        time: 'nu', ts: new Date().toISOString(), read: false, channel: 'Teams · Webshop' }));
      if (notes.length) {
        st.notes = notes.concat(this.state.notes);
        const who = notes.map(n => this.U(n.to).name).filter((v, i, a) => a.indexOf(v) === i).join(' og ');
        this.setState(st);
        this.flash(who + ' fik besked ' + VIA() + ' om, at “' + next[0].text + '” nu kan gå i gang.');
        return;
      }
      if (b) { this.setState(st); this.flash('Markeret færdig før “' + b.text + '”.'); return; }
    }
    this.setState(st);
  }

  drill(id) {
    this.setState({ trail: (this.state.trail || []).concat([this.state.sel]), sel: id,
      notes: this.state.notes.map(n => n.task === id ? Object.assign({}, n, { read: true }) : n) });
  }
  back() {
    const tr = (this.state.trail || []).slice(), prev = tr.pop();
    this.setState({ trail: tr, sel: prev || null });
  }
  open(id) { if (this.skipOpen) return; this.setState({ trail: [], lbUI: Object.assign({}, this.state.lbUI, { open: false, editId: null, creating: false }) }); this.setState({ sel: id, notes: this.state.notes.map(n => n.task === id ? Object.assign({}, n, { read: true }) : n) }); }

  blankBatch() {
    return { open: false, tab: 'paste', raw: '', hasHeader: true, map: null,
      shared: { owner: '', due: '', prio: '', members: [] }, picks: [] };
  }
  bset(patch) { this.setState({ batch: Object.assign({}, this.state.batch, patch) }); }
  sset(patch) { this.bset({ shared: Object.assign({}, this.state.batch.shared, patch) }); }

  splitLine(l) {
    const d = l.indexOf('\t') >= 0 ? '\t' : (l.indexOf(';') >= 0 ? ';' : ',');
    return l.split(d).map(x => x.trim().replace(/^"|"$/g, ''));
  }
  guessField(h) {
    const x = (h || '').toLowerCase();
    if (/opgave|titel|navn|title/.test(x)) return 'title';
    if (/område|omraade|projekt|area/.test(x)) return 'project';
    if (/ejer|ansvarlig|owner|hvem/.test(x)) return 'owner';
    if (/deadline|slut|dato|due/.test(x)) return 'due';
    if (/estimat|timer|est|hours/.test(x)) return 'est';
    if (/prio/.test(x)) return 'prio';
    return 'skip';
  }
  parseDate(s) {
    s = (s || '').trim(); if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1] + '-' + d2(+m[2]) + '-' + d2(+m[3]);
    m = s.match(/^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?\.?$/);
    if (m) { let y = m[3] ? +m[3] : THIS_YEAR(); if (y < 100) y += 2000; return y + '-' + d2(+m[2]) + '-' + d2(+m[1]); }
    m = s.match(/^(\d{1,2})\.?\s*([a-zæøå]+)\.?\s*(\d{4})?$/i);
    if (m) { const i = MONTH.map(x => x.toLowerCase().slice(0, 3)).indexOf(m[2].toLowerCase().slice(0, 3));
      if (i >= 0) return (m[3] || String(THIS_YEAR())) + '-' + d2(i + 1) + '-' + d2(+m[1]); }
    return null;
  }
  parsePerson(s) {
    s = (s || '').trim().toLowerCase(); if (!s) return null;
    const p = this.state.people.filter(u => u.name.toLowerCase().indexOf(s) === 0 || u.initials.toLowerCase() === s)[0];
    return p ? p.id : null;
  }
  parseProject(s) {
    s = (s || '').trim().toLowerCase(); if (!s) return null;
    const p = this.state.projects.filter(x => x.name.toLowerCase().indexOf(s) >= 0 || s.indexOf(x.name.toLowerCase()) >= 0)[0];
    return p ? p.id : null;
  }
  parsePrio(s) {
    s = (s || '').trim().toLowerCase(); if (!s) return null;
    if (/høj|hoj|high/.test(s)) return 'hoej';
    if (/lav|low/.test(s)) return 'lav';
    if (/normal|med/.test(s)) return 'normal';
    return null;
  }
  batchParse() {
    const b = this.state.batch;
    const lines = b.raw.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return { head: [], map: [], rows: [] };
    const head = this.splitLine(lines[0]);
    const map = b.map && b.map.length === head.length ? b.map
      : (b.hasHeader ? head.map(h => this.guessField(h)) : head.map((h, i) => i === 0 ? 'title' : 'skip'));
    const body = b.hasHeader ? lines.slice(1) : lines;
    const sh = b.shared;
    const rows = body.map(l => {
      const cells = this.splitLine(l), r = { title: '', project: null, owner: null, due: null, est: 0, prio: null, issues: [] };
      map.forEach((f, i) => {
        const val = cells[i] || '';
        if (f === 'title') r.title = val;
        if (f === 'project') { r.project = this.parseProject(val); if (val && !r.project) r.issues.push('ukendt område “' + val + '”'); }
        if (f === 'owner') { r.owner = this.parsePerson(val); if (val && !r.owner) r.issues.push('ukendt person “' + val + '”'); }
        if (f === 'due') { r.due = this.parseDate(val); if (val && !r.due) r.issues.push('datoen “' + val + '” kunne ikke læses'); }
        if (f === 'est') r.est = parseFloat(val.replace(',', '.')) || 0;
        if (f === 'prio') { r.prio = this.parsePrio(val); if (val && !r.prio) r.issues.push('ukendt prioritet “' + val + '”'); }
      });
      if (sh.owner) r.owner = sh.owner;
      if (sh.due) r.due = sh.due;
      if (sh.prio) r.prio = sh.prio;
      if (!r.owner) r.owner = this.state.me;
      if (!r.prio) r.prio = 'normal';
      if (!r.project) { r.project = this.state.projects[0].id; r.issues.push('område mangler'); }
      if (!r.title) r.issues.push('ingen titel');
      return r;
    });
    return { head, map, rows };
  }
  createBatch() {
    this.snap('batchoprettelse');
    const p = this.batchParse(), sh = this.state.batch.shared;
    const rows = p.rows.filter(r => r.title);
    if (!rows.length) { this.flash('Indsæt mindst én linje med en titel.'); return; }
    const now = Date.now();
    const tasks = rows.map((r, i) => ({ id: 'b' + now + i, title: r.title, desc: '', project: r.project, owner: r.owner,
      members: [r.owner].concat(sh.members.filter(m => m !== r.owner)), labels: [], status: 'gang', prio: r.prio,
      start: null, due: r.due, est: r.est, spent: 0, checklist: [], deps: [], recur: null, recurring: null,
      waiting: null, files: [] }));
    this.setState({ tasks: this.state.tasks.concat(tasks), batch: this.blankBatch(), view: 'tabel',
      statusOff: Object.keys(this.state.statusOff).reduce((o,k) => { if (k !== 'gang') o[k] = this.state.statusOff[k]; return o; }, {}) });
    this.flash(tasks.length + ' opgaver oprettet.');
  }

  saveTemplate(taskId) {
    const t = this.T(taskId);
    const tpl = { id: 'tp' + Date.now(), name: t.title, project: t.project, prio: t.prio, est: t.est,
      checklist: t.checklist.map(c => ({ text: c.text, by: c.by, offset: null, after: c.after, id: c.id })) };
    this.setState({ templates: this.state.templates.concat([tpl]) });
    this.flash('“' + t.title + '” er gemt som skabelon med ' + t.checklist.length + ' punkter.');
  }
  createFromTemplates() {
    this.snap('oprettelse fra skabelon');
    const b = this.state.batch, sh = b.shared;
    const picks = this.state.templates.filter(t => b.picks.indexOf(t.id) >= 0);
    if (!picks.length) { this.flash('Vælg mindst én skabelon.'); return; }
    const now = Date.now();
    const tasks = picks.map((tp, i) => {
      const owner = sh.owner || this.state.me;
      return { id: 'tp' + now + i, title: tp.name, desc: '', project: tp.project, owner,
        members: [owner].concat(sh.members.filter(m => m !== owner)), labels: [], status: 'gang',
        prio: sh.prio || tp.prio, start: null, due: sh.due || null, est: tp.est, spent: 0,
        checklist: tp.checklist.map((c, j) => ({ id: 'c' + now + i + j, text: c.text, done: false, by: sh.owner || c.by, due: null, after: null })),
        deps: [], recur: null, recurring: null, waiting: null, files: [] };
    });
    const n = tasks.reduce((a, t) => a + t.checklist.length, 0);
    this.setState({ tasks: this.state.tasks.concat(tasks), batch: this.blankBatch(), view: 'tabel',
      statusOff: Object.keys(this.state.statusOff).reduce((o,k) => { if (k !== 'gang') o[k] = this.state.statusOff[k]; return o; }, {}) });
    this.flash(tasks.length + (tasks.length === 1 ? ' opgave' : ' opgaver') + ' oprettet med ' + n + ' checklistepunkter.');
  }

  blankRecur() { return { mode: 'none', every: 1, weekdays: [2], dayMode: 'dag', monthDay: 25, nth: '1', nthDay: 1, month: 9, endMode: 'never', endCount: 12, endDate: '' }; }

  openNew() {
    const me = this.state.me;
    this.setState({ draft: { editId: null, title: '', project: '', owner: me, members: [me], labels: [], prio: 'normal',
      start: '', due: TODAY, est: '', desc: '', checklist: [], files: [], status: 'gang',
      recur: this.blankRecur(), newItem: { text: '', by: me, due: '' }, showRecur: false, mail: null } });
  }
  openEdit(id) {
    const t = this.T(id);
    this.setState({ draft: { editId: id, title: t.title, project: t.project, owner: t.owner, members: t.members.slice(),
      labels: t.labels.slice(), prio: t.prio, start: t.start || '', due: t.due || '', est: t.est ? String(t.est) : '',
      desc: t.desc || '', checklist: t.checklist.map(c => Object.assign({}, c)), files: t.files.slice(), status: t.status,
      recur: t.recur ? Object.assign({}, t.recur) : this.blankRecur(), newItem: { text: '', by: t.owner, due: '' }, showRecur: !!t.recur, private: !!t.private, ongoing: !!t.ongoing } });
  }
  applyTemplate(id) {
    const t = this.state.templates.filter(x => x.id === id)[0]; if (!t) return;
    const now = Date.now(), map = {};
    (t.checklist || []).forEach((c, i) => { map[c.id || i] = 'c' + now + '-' + i; });
    const d = this.state.draft;
    this.dset({ title: d.title || t.name, project: t.project || d.project, prio: t.prio || d.prio,
      est: t.est ? String(t.est) : d.est,
      checklist: (t.checklist || []).map((c, i) => ({ id: map[c.id || i], text: c.text, done: false, by: c.by || d.owner, due: null,
        after: c.after && map[c.after] ? map[c.after] : null })) });
  }
  dset(patch) { this.setState({ draft: Object.assign({}, this.state.draft, patch) }); }
  mset(patch) { this.dset({ mail: Object.assign({ open: true, text: '', busy: false, err: '', note: '' }, this.state.draft.mail || {}, patch) }); }
  mailFill(mail) {
    const s = this.state, d = s.draft; if (!d || !window.FlowMail) return;
    const g = window.FlowMail.suggest(mail, { areas: s.projects, people: s.people, me: s.me });
    const now = Date.now();
    const items = g.items.map((t, i) => ({ id: 'c' + now + '-' + i, text: t, done: false, by: d.owner, due: null, after: null }));
    const members = d.members.slice(); g.members.forEach(m => { if (members.indexOf(m) < 0) members.push(m); });
    const patch = { title: g.title, desc: g.desc, prio: g.prio, members, checklist: d.checklist.concat(items), fromMail: true };
    if (g.due) patch.due = g.due;
    if (g.areas.length) { patch.project = g.areas[0]; patch.labels = g.areas.slice(1); }
    const bits = [g.due ? 'deadline ' + fmt(g.due) : 'ingen deadline fundet, så den står til i dag', g.areas.length ? 'område ' + g.areas.map(a => this.P(a).name).join(' + ') : 'intet område fundet', g.prio === 'hoej' ? 'høj prioritet' : null, items.length ? items.length + ' checklistepunkter' : null].filter(Boolean);
    this.setState({ draft: Object.assign({}, d, patch, { mail: { open: false, text: '', busy: false, err: '', note: 'Udfyldt fra mail' + (g.from ? ' fra ' + g.from : '') + ': ' + bits.join(', ') + '. Tjek felterne, før du opretter.' } }) });
  }
  mailFromText() { const m = this.state.draft.mail || {}; if (!(m.text || '').trim()) { this.mset({ err: 'Indsæt mailens tekst først.' }); return; } this.mailFill(window.FlowMail.fromPasted(m.text)); }
  mailFromFile(file) {
    if (!file) return;
    if (!/\.(eml|msg|txt)$/i.test(file.name)) { this.mset({ err: 'Træk en mail fra Outlook ind, eller en .eml/.msg-fil.' }); return; }
    this.mset({ busy: true, err: '' });
    window.FlowMail.readFile(file).then(m => this.mailFill(m)).catch(e => this.mset({ busy: false, err: e.message || 'Mailen kunne ikke læses.' }));
  }
  rset(patch) { this.dset({ recur: Object.assign({}, this.state.draft.recur, patch) }); }
  toggleIn(key, val) {
    const cur = this.state.draft[key], has = cur.indexOf(val) >= 0;
    this.dset({ [key]: has ? cur.filter(x => x !== val) : cur.concat([val]) });
  }
  toggleWd(n) {
    const cur = this.state.draft.recur.weekdays, has = cur.indexOf(n) >= 0;
    const next = has ? cur.filter(x => x !== n) : cur.concat([n]).sort();
    this.rset({ weekdays: next.length ? next : [n] });
  }
  addItem() {
    const d = this.state.draft, it = d.newItem;
    if (!it.text.trim()) return;
    this.dset({ checklist: d.checklist.concat([{ id: 'c' + Date.now() + '-' + d.checklist.length, text: it.text.trim(), done: false, by: it.by, due: it.due || null, after: null }]),
      newItem: { text: '', by: it.by, due: '' } });
  }
  updItem(i, patch) { this.dset({ checklist: this.state.draft.checklist.map((c, j) => j === i ? Object.assign({}, c, patch) : c) }); }
  delItem(i) { const d = this.state.draft, gone = d.checklist[i];
    this.dset({ checklist: d.checklist.filter((c, j) => j !== i).map(c => gone && c.after === gone.id ? Object.assign({}, c, { after: null }) : c) }); }
  deleteItem(taskId, i) {
    const t = this.T(taskId), gone = t.checklist[i]; if (!gone) return;
    this.snap('slettet punkt “' + gone.text + '”');
    this.setState({ warn: null, tasks: this.state.tasks.map(x => x.id !== taskId ? x : Object.assign({}, x, { dirty: true,
      checklist: x.checklist.filter((c, j) => j !== i).map(c => c.after === gone.id ? Object.assign({}, c, { after: null }) : c) })) });
    this.flash('“' + (gone.text || 'Punktet') + '” er slettet.');
  }
  clearChecklist(taskId) {
    const t = this.T(taskId), n = (t.checklist || []).length;
    this.snap('slettet tjekliste på “' + t.title + '”');
    this.setState({ clearAsk: null, warn: null, tasks: this.state.tasks.map(x => x.id !== taskId ? x : Object.assign({}, x, { checklist: [], dirty: true, log: this.addLog(x, 'Slettede tjeklisten (' + n + ' punkter)') })) });
    this.flash(n + ' punkter er slettet.');
  }

  pickFiles(target) { this.fileTarget = target; if (this.fileRef && this.fileRef.current) this.fileRef.current.click(); }
  fileSize(b) { return b > 1048576 ? num(b / 1048576) + ' MB' : b > 1024 ? Math.round(b / 1024) + ' KB' : b + ' B'; }
  addFiles(list) {
    const arr = Array.prototype.slice.call(list || []);
    if (!arr.length) return;
    const me = this.state.me;
    const mapped = arr.map(f => ({ name: f.name, size: this.fileSize(f.size), by: me, when: 'nu', ts: new Date().toISOString(),
      kind: (f.name.split('.').pop() || 'FIL').toUpperCase().slice(0, 4) }));
    if (this.fileTarget === 'draft' && this.state.draft) this.dset({ files: this.state.draft.files.concat(mapped) });
    else {
      const id = this.fileTarget;
      this.setState({ tasks: this.state.tasks.map(t => t.id === id ? Object.assign({}, t, { files: t.files.concat(mapped) }) : t) });
      this.flash(mapped.length === 1 ? '“' + mapped[0].name + '” er vedhæftet.' : mapped.length + ' filer er vedhæftet.');
    }
  }
  onFileInput(e) { this.addFiles(e.target.files); e.target.value = ''; }
  onDrop(target, e) {
    e.preventDefault(); this.setState({ dragOver: false });
    this.fileTarget = target; this.addFiles(e.dataTransfer.files);
  }
  delFile(taskId, i) {
    this.setState({ tasks: this.state.tasks.map(t => t.id === taskId ? Object.assign({}, t, { files: t.files.filter((f, j) => j !== i) }) : t) });
  }
  delDraftFile(i) { this.dset({ files: this.state.draft.files.filter((f, j) => j !== i) }); }

  L(id) { return this.state.projects.filter(x => x.id === id)[0] || this.state.labelDefs.filter(x => x.id === id)[0]; }
  lbVals(isOn, toggle) {
    const s = this.state;
    return {
        lbOpen: s.lbUI.open,
        onLbToggle: () => this.lset({ open: !s.lbUI.open, editId: null, creating: false, q: '' }),
        lbQ: s.lbUI.q, onLbQ: (e) => this.lset({ q: e.target.value }),
        lbRows: s.projects.filter(l => !s.lbUI.q || l.name.toLowerCase().indexOf(s.lbUI.q.toLowerCase()) >= 0).map(l => {
          const on = isOn(l.id);
          return { name: l.name, color: l.color, mark: on ? '✓' : '',
            boxBorder: on ? '#231F20' : '#C9C4BA', boxFill: on ? '#231F20' : 'transparent',
            onToggle: () => toggle(l.id),
            onEdit: (e) => { if (e) e.stopPropagation(); this.lset({ editId: l.id, creating: false, name: l.name, color: l.color }); } };
        }),
        lbEditing: !!(s.lbUI.editId || s.lbUI.creating),
        lbEditHeading: s.lbUI.editId ? 'Rediger område' : 'Nyt område',
        lbName: s.lbUI.name, onLbName: (e) => this.lset({ name: e.target.value }),
        lbSwatches: SWATCH.map(c => ({ color: c, ring: s.lbUI.color === c ? '#231F20' : 'transparent',
          onClick: () => this.lset({ color: c }) })),
        lbHex: s.lbUI.color,
        onLbHex: (e) => { let x = e.target.value.trim(); if (x && x[0] !== '#') x = '#' + x; this.lset({ color: x }); },
        onLbNew: () => this.lset({ creating: true, editId: null, name: '', color: SWATCH[0] }),
        onLbSave: () => this.saveLabel(),
        onLbCancel: () => this.lset({ editId: null, creating: false, name: '' }),
        lbCanDelete: !!s.lbUI.editId,
        onLbDelete: () => this.delLabel(s.lbUI.editId)
    };
  }
  lset(patch) { this.setState({ lbUI: Object.assign({}, this.state.lbUI, patch) }); }
  pset(patch) { this.setState({ prUI: Object.assign({}, this.state.prUI, patch) }); }

  saveLabel() {
    const u = this.state.lbUI, name = u.name.trim();
    if (!name) { this.flash('Giv området et navn.'); return; }
    if (u.editId) {
      this.setState({ projects: this.state.projects.map(l => l.id === u.editId ? Object.assign({}, l, { name, color: u.color }) : l) });
    } else {
      const id = 'p' + Date.now();
      this.setState({ projects: this.state.projects.concat([{ id, name, color: u.color }]) });
      if (this.state.draft) this.toggleDraftArea(id);
      else if (this.state.sel && this.T(this.state.sel)) this.toggleLabelOn(this.state.sel, id);
    }
    this.lset({ editId: null, name: '', color: SWATCH[0], creating: false });
  }
  delLabel(id) {
    const used = this.state.tasks.filter(t => this.inArea(t, id)).length;
    if (used) { this.flash('Området bruges på ' + used + ' opgaver. Fjern det fra dem først, så kan det slettes.'); return; }
    this.setState({ projects: this.state.projects.filter(l => l.id !== id) });
    this.lset({ editId: null, name: '', creating: false });
  }
  saveProject() {
    const u = this.state.prUI, name = u.name.trim();
    if (!name) { this.flash('Giv området et navn.'); return; }
    if (u.editId) {
      this.setState({ projects: this.state.projects.map(p => p.id === u.editId ? Object.assign({}, p, { name, color: u.color }) : p) });
    } else {
      const id = 'p' + Date.now();
      this.setState({ projects: this.state.projects.concat([{ id, name, color: u.color }]) });
      if (this.state.draft) this.dset({ project: id });
    }
    this.pset({ editId: null, name: '', color: SWATCH[0], creating: false });
  }
  delProject(id) {
    const used = this.state.tasks.filter(t => t.project === id).length;
    if (used) { this.flash('Området har ' + used + ' opgaver. Flyt dem først, så kan området slettes.'); return; }
    this.setState({ projects: this.state.projects.filter(p => p.id !== id) });
    this.pset({ editId: null, name: '', creating: false });
  }

  recurText(r) {
    if (!r || r.mode === 'none') return null;
    const n = Math.max(1, parseInt(r.every, 10) || 1);
    let s = '';
    if (r.mode === 'day') s = n === 1 ? 'Hver dag' : 'Hver ' + n + '. dag';
    if (r.mode === 'week') {
      const days = r.weekdays.slice().sort().map(d => WDLONG[d]).join(', ');
      s = (n === 1 ? 'Hver uge' : 'Hver ' + n + '. uge') + ' på ' + days;
    }
    if (r.mode === 'month') {
      const base = n === 1 ? 'hver måned' : 'hver ' + n + '. måned';
      s = r.dayMode === 'dag'
        ? 'Den ' + r.monthDay + '. i ' + base
        : 'Den ' + (NTH.filter(x => x[0] === String(r.nth))[0] || NTH[0])[1] + ' ' + WDLONG[r.nthDay] + ' i ' + base;
    }
    if (r.mode === 'year') s = (n === 1 ? 'Hvert år' : 'Hvert ' + n + '. år') + ' den ' + r.monthDay + '. ' + MONTH[r.month - 1];
    if (r.endMode === 'count') s += ', ' + r.endCount + ' gange';
    if (r.endMode === 'date' && r.endDate) s += ', til ' + fmt(r.endDate);
    return s;
  }

  weekDays() {
    const d = new Date(TODAY + 'T00:00:00'), back = (d.getDay() + 6) % 7;
    return [0,1,2,3,4].map(i => { const x = new Date(d); x.setDate(x.getDate() - back + i);
      return x.getFullYear() + '-' + d2(x.getMonth() + 1) + '-' + d2(x.getDate()); });
  }
  setPlanned(id, iso) {
    this.setState({ tasks: this.state.tasks.map(t => t.id === id ? Object.assign({}, t, { planned: iso, dirty: true }) : t) });
    const t = this.T(id);
    this.flash(iso ? '“' + t.title + '” er planlagt til ' + fmt(iso) + '. Deadline er uændret.'
      : 'Planlagt dag fjernet fra “' + t.title + '”.');
  }

  deleteTask(id) {
    const t = this.T(id);
    this.snap('sletning af “' + t.title + '”');
    this.setState({
      tasks: this.state.tasks.filter(x => x.id !== id).map(x => x.deps.indexOf(id) >= 0
        ? Object.assign({}, x, { deps: x.deps.filter(d => d !== id) }) : x),
      notes: this.state.notes.filter(nn => nn.task !== id),
      draft: null, sel: null,
      timerTask: this.state.timerTask === id ? null : this.state.timerTask
    });
    this.flash('“' + t.title + '” er slettet.');
  }

  saveDraft() {
    const d = this.state.draft;
    this.snap(d.editId ? 'redigering af opgave' : 'ny opgave');
    if (!d.title.trim()) { this.flash('Giv opgaven en titel, før du opretter den.'); return; }
    const rec = this.recurText(d.recur);
    const fallbackArea = (this.state.projects.find(p => /øvrig/i.test(p.name)) || this.state.projects[0] || {}).id;
    const patch = { title: d.title.trim(), project: d.project || fallbackArea, owner: d.owner, members: d.members.length ? d.members : [d.owner],
      labels: d.labels, prio: d.prio, start: d.start || null, due: d.due || null, est: parseFloat(String(d.est).replace(',', '.')) || 0,
      desc: d.desc, checklist: d.checklist, files: d.files, recur: d.recur.mode === 'none' ? null : d.recur, recurring: rec, private: !!d.private, ongoing: !!d.ongoing };
    if (d.editId) {
      this.setState({ tasks: this.state.tasks.map(t => t.id === d.editId ? Object.assign({}, t, patch) : t), draft: null });
      this.flash('“' + patch.title + '” er opdateret.');
    } else {
      const id = 'n' + Date.now();
      const task = Object.assign({ id, status: d.status, spent: 0, deps: [], waiting: null, created: new Date().toISOString(), createdBy: this.state.me, log: [] }, patch);
      const sp = parseFloat(String(d.spentNow || '').replace(',', '.'));
      const ent = sp > 0 ? [[id, this.state.me, TODAY, sp, 'manuel']] : [];
      if (sp > 0) task.spent = sp;
      if (d.fromMail) task.log = [{ ts: new Date().toISOString(), by: this.state.me, text: 'Oprettet fra mail' }];
      this.setState({ tasks: this.state.tasks.concat([task]), entries: this.state.entries.concat(ent), draft: null, sel: id });
      this.flash('“' + patch.title + '” er oprettet' + (rec ? ' · gentages: ' + rec.toLowerCase() : '') + '.');
    }
  }

  dueMeta(t) {
    if (!t.due) return { label: 'Ingen dato', short: '—', color: '#C9C4BA' };
    if (t.status === 'faerdig') return { label: 'Færdig', short: '✓', color: '#123C2F' };
    const dd = dayDiff(t.due, TODAY);
    if (dd < 0) return { label: Math.abs(dd) + ' d. over', short: Math.abs(dd) + 'd over', color: '#9C160D' };
    if (dd === 0) return { label: 'I dag', short: 'I dag', color: '#9C160D' };
    if (dd === 1) return { label: 'I morgen', short: 'I morgen', color: '#7A6047' };
    const wd = WD[new Date(t.due + 'T00:00:00').getDay()].toLowerCase();
    return { label: wd + '. ' + fmt(t.due), short: fmt(t.due), color: dd <= 6 ? '#4A443F' : '#9C948B' };
  }

  blockedText(t) {
    if (t.status !== 'pplads') return null;
    const days = t.due ? Math.abs(dayDiff(t.due, TODAY)) : 0;
    const base = 'På P-pladsen: påbegyndt, men kan ikke komme videre. ';
    if (t.waiting === 'ekstern') return base + 'Venter på en ekstern part. Systemet minder dig hver 3. dag, og eskalerer efter 10.';
    return base + 'Deadline passerede for ' + days + ' dage siden — sæt ny dato, eller flyt den tilbage til Idébanken.';
  }

  card(t) {
    const p = this.P(t.project), o = this.U(t.owner), st = STATUS[t.status], pr = PRIO[t.prio], du = this.dueMeta(t);
    const sp = this.liveSpent(t), done = t.status === 'faerdig';
    const ck = t.checklist.filter(x => x.done).length;
    const on = this.state.timerTask === t.id;
    return {
      id: t.id, title: t.title, project: p.name, projectColor: p.color,
      titleColor: done ? '#9C948B' : (t.status === 'ide' ? '#4A443F' : '#231F20'),
      checkBorder: done ? '#123C2F' : '#C9C4BA', checkFill: done ? '#123C2F' : 'transparent',
      ownerInitials: o.initials, ownerColor: o.color, ownerFirst: o.name, owner: o.name,
      statusLabel: st.label, statusColor: st.color, statusBg: st.bg,
      prioLabel: pr.label, prioColor: pr.color,
      dueLabel: du.label, dueShort: du.short, dueColor: du.color,
      estLabel: t.est ? hrs(t.est) : '–', spentLabel: sp > 0 ? hrs(sp) : '–',
      timeLabel: t.est ? num(sp) + ' / ' + num(t.est) + ' t' : '–',
      prioMark: t.prio === 'hoej' ? '!' : null,
      prioMarkColor: '#9C160D',
      overLabel: t.est && sp > t.est ? '+' + num(sp - t.est) + ' t' : null,
      timerIcon: this.state.timerTask === t.id ? '■' : '▶',
      running: this.state.timerTask === t.id,
      runLabel: this.state.timerTask === t.id ? (() => { const ms = Date.now() - this.state.timerStart;
        const s2 = Math.floor(ms / 1000); return d2(Math.floor(s2 / 3600)) + ':' + d2(Math.floor(s2 % 3600 / 60)) + ':' + d2(s2 % 60); })() : null,
      tableTime: t.est ? (sp > t.est ? '+' + num(sp - t.est) + ' t' : num(sp) + ' / ' + num(t.est)) : '–',
      notRunning: this.state.timerTask !== t.id,
      isSub: !!t.parent,
      rollDone: (() => { const subs = this.state.tasks.filter(x => x.parent === t.id);
        return t.checklist.filter(c => c.done).length + subs.filter(x => x.status === 'faerdig').length; })(),
      rollTotal: (() => { const subs = this.state.tasks.filter(x => x.parent === t.id);
        return t.checklist.length + subs.length; })(),
      rollPct: (() => { const subs = this.state.tasks.filter(x => x.parent === t.id);
        const tot = t.checklist.length + subs.length;
        if (!tot) return null;
        const dn = t.checklist.filter(c => c.done).length + subs.filter(x => x.status === 'faerdig').length;
        return (dn / tot * 100) + '%'; })(),
      rollLabel: (() => { const subs = this.state.tasks.filter(x => x.parent === t.id);
        const tot = t.checklist.length + subs.length;
        if (!tot) return null;
        const dn = t.checklist.filter(c => c.done).length + subs.filter(x => x.status === 'faerdig').length;
        return dn + '/' + tot; })(),
      tableTime2: this.state.timerTask === t.id ? (() => { const s2 = Math.floor((Date.now() - this.state.timerStart) / 1000);
        return d2(Math.floor(s2 / 3600)) + ':' + d2(Math.floor(s2 % 3600 / 60)) + ':' + d2(s2 % 60); })()
        : (t.est ? (sp > t.est ? '+' + num(sp - t.est) + ' t' : num(sp) + ' / ' + num(t.est)) : '–'),
      timeColor2: this.state.timerTask === t.id ? '#0031EB' : (t.est && sp > t.est ? '#9C160D' : '#6E675F'),
      onCheck: (e) => { if (e) { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation(); }
        this.skipOpen = true;
        this.setStatus(t.id, t.status === 'faerdig' ? 'gang' : 'faerdig');
        setTimeout(() => { this.skipOpen = false; }, 0); },
      timeWeight: t.est && sp > t.est ? 700 : 400,
      timeColor: t.est && sp > t.est ? '#9C160D' : '#6E675F',
      varLabel: sp > 0 && t.est ? (sp > t.est ? '+' + num(sp - t.est) : num(sp - t.est)) : '–',
      varColor: t.est && sp > t.est ? '#9C160D' : (sp > 0 ? '#123C2F' : '#9C948B'),
      checklistLabel: t.checklist.length ? ck + '/' + t.checklist.length : null,
      labelChips: (t.labels || []).map(id => this.L(id)).filter(l => l).map(l => ({
        color: l.color, name: this.state.labelsExpanded ? l.name : '',
        w: this.state.labelsExpanded ? 'auto' : '9px', h: this.state.labelsExpanded ? '16px' : '9px',
        radius: this.state.labelsExpanded ? '3px' : '50%',
        pad: this.state.labelsExpanded ? '1px 7px' : '0',
        onClick: (e) => { if (e) e.stopPropagation(); this.setState({ labelsExpanded: !this.state.labelsExpanded }); } })),
      fileLabel: (t.files || []).length ? (t.files.length + ' filer') : null,
      metaExtra: t.checklist.length ? ck + ' af ' + t.checklist.length + ' punkter' : null,
      dirty: !!t.dirty,
      plannedChip: t.planned ? (t.planned === TODAY ? 'Planlagt i dag' : 'Planlagt ' + WD[new Date(t.planned + 'T00:00:00').getDay()].toLowerCase() + '. ' + fmt(t.planned)) : null,
      recurring: t.recurring,
      blockedLabel: t.status === 'pplads' ? (t.waiting === 'ekstern' ? 'Venter på ekstern support' : 'Står stille — ingen ny dato') : null,
      timerLabel: on ? 'Stop' : 'Start',
      timerBorder: on ? '#0031EB' : '#DFDBD3', timerColor: on ? '#fff' : '#6E675F', timerBg: on ? '#0031EB' : '#fff',
      onOpen: () => this.open(t.id),
      onTimer: (e) => { if (e) e.stopPropagation(); this.toggleTimer(t.id); }
    };
  }

  openSearch() {
    this.srchRef = this.srchRef || React.createRef();
    this.setState({ srchUI: { q: '', sel: 0 } }, () => setTimeout(() => this.srchRef.current && this.srchRef.current.focus(), 0));
  }
  searchVals() {
    const u = this.state.srchUI; if (!u) return null;
    const norm = (x) => (x || '').toLowerCase();
    const words = norm(u.q).trim().split(/\s+/).filter(Boolean);
    let hits = this.state.tasks.filter(t => !this.hiddenFor(t)).map(t => {
      const p = this.P(t.project) || {};
      const title = norm(t.title), rest = [t.desc, p.name, (t.checklist || []).map(c => c.text).join(' ')].map(norm).join(' ');
      if (!words.every(w => title.indexOf(w) >= 0 || rest.indexOf(w) >= 0)) return null;
      const score = words.filter(w => title.indexOf(w) >= 0).length * 10 + (t.status === 'faerdig' ? 0 : 1);
      return { t, p, score };
    }).filter(Boolean);
    if (!words.length) hits = hits.filter(h => h.t.status !== 'faerdig');
    hits.sort((a, b) => b.score - a.score);
    hits = hits.slice(0, 30);
    const sel = Math.min(u.sel, Math.max(0, hits.length - 1));
    const go = (id) => { this.setState({ srchUI: null }); this.open(id); };
    return {
      q: u.q, inputRef: this.srchRef, empty: hits.length === 0,
      onClose: () => this.setState({ srchUI: null }),
      onQ: (e) => this.setState({ srchUI: { q: e.target.value, sel: 0 } }),
      onKey: (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.setState({ srchUI: Object.assign({}, u, { sel: Math.min(sel + 1, hits.length - 1) }) }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.setState({ srchUI: Object.assign({}, u, { sel: Math.max(sel - 1, 0) }) }); }
        else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); go(hits[sel].t.id); }
      },
      rows: hits.map((h, i) => ({ title: h.t.title,
        sub: [h.p.name, this.U(h.t.owner).name, h.t.due ? fmt(h.t.due) : null].filter(Boolean).join(' · '),
        status: this.archived(h.t) ? 'Arkiveret' : (h.t.ongoing ? 'Løbende' : STATUS[h.t.status].label), color: h.p.color || '#C9C4BA',
        bg: i === sel ? '#F3F1EC' : 'transparent',
        onHover: () => { if (i !== sel) this.setState({ srchUI: Object.assign({}, u, { sel: i }) }); },
        onOpen: () => go(h.t.id) }))
    };
  }
  renderVals() {
    const s0 = this.state;
    const mineOnly = s0.onlyMine && s0.view !== 'dag' && s0.view !== 'inbox';
    const pool0 = s0.tasks.filter(t => !this.hiddenFor(t) && (s0.view === 'tid' || (!this.archived(t) && !t.ongoing)) && (!s0.projFilter || this.inArea(t, s0.projFilter))
      && (!mineOnly || t.owner === s0.me || t.checklist.some(c => c.by === s0.me)));
    const s = pool0.length === s0.tasks.length ? s0 : Object.assign({}, s0, { tasks: pool0 });
    const me = this.U(s.me);
    const unread = s.notes.filter(n => n.to === s.me && !n.read).length;
    const mk = (id, label, icon) => ({ id, label, icon, bg: s.view === id ? '#3A3533' : 'transparent',
      color: s.view === id ? '#FFFFFF' : '#B5AEA6', weight: s.view === id ? 600 : 400,
      onClick: () => this.setState({ view: id }) });

    const v = {
      navMain: [mk('dag','Min dag','◆'), Object.assign(mk('inbox','Indbakke','✉'), { badge: unread || null })],
      navViews: [mk('tabel','Opgaver','☰'), mk('lob','Løbende arbejde','↻'), mk('gantt','Tidslinje','▭'), mk('kal','Kalender','▦'), mk('board','Board','▤'), mk('tid','Tid','◷'), mk('dash','Overblik','◫')],
      projectNav: s0.projects.map(p => ({ name: p.name, color: p.color,
        open: s0.tasks.filter(t => this.inArea(t, p.id) && t.status !== 'faerdig' && !t.ongoing && !this.hiddenFor(t)).length,
        active: s0.projFilter === p.id,
        bg: s0.projFilter === p.id ? '#3A3533' : 'transparent',
        text: s0.projFilter === p.id ? '#FAF9F6' : '#B5AEA6',
        onClick: () => this.setState({ projFilter: s0.projFilter === p.id ? null : p.id, sel: null }) })),
      filterName: s0.projFilter ? this.P(s0.projFilter).name : null,
      filterColor: s0.projFilter ? this.P(s0.projFilter).color : null,
      onClearFilter: () => this.setState({ projFilter: null }),
      canScope: ['tabel','gantt','board','tid','dash'].indexOf(s0.view) >= 0,
      onlyMine: s0.onlyMine,
      onlyMineLabel: s0.onlyMine ? 'Kun mine opgaver' : 'Alle opgaver',
      onlyMineBg: s0.onlyMine ? '#231F20' : '#fff',
      onlyMineColor: s0.onlyMine ? '#fff' : '#4A443F',
      onlyMineBorder: s0.onlyMine ? '#231F20' : '#DFDBD3',
      onToggleMine: () => this.setState({ onlyMine: !s0.onlyMine }),
      meInitials: me.initials, meColor: me.color,
      stopClick: (e) => e.stopPropagation(),
      onSearchOpen: () => this.openSearch(),
      srch: this.searchVals(),
      canUndo: (this.hist || []).length > 0,
      onOpenPeople: () => this.setState({ pplUI: { open: true } }),
      ppl: (s0.pplUI || {}).open ? {
        rows: s0.people.map(p => ({ name: p.name, initials: p.initials, color: p.color,
          count: s0.tasks.filter(t => t.owner === p.id).length + ' opgaver' + (this.props.isAdmin ? (p.uid ? ' · ' + (p.email || 'har login')
            : ((s0.inviteList || []).some(i => p.email && i.email === p.email.toLowerCase()) ? ' · inviteret' : (p.email ? ' · ' + p.email : ' · ingen e-mail'))) : ''),
          inviteLabel: !this.props.isAdmin || !this.props.invite || p.uid || !p.email ? null
            : ((s0.inviteList || []).some(i => i.email === p.email.toLowerCase()) ? 'Send igen' : 'Invitér'),
          invited: !p.uid && (s0.inviteList || []).some(i => p.email && i.email === p.email.toLowerCase()),
          onInvite: () => this.sendInvite(p),
          onEdit: () => this.setState({ pplUI: { open: true, editId: p.id, name: p.name, email: p.email || '', color: p.color } }),
          onDelete: () => this.delPerson(p.id) })),
        editing: !!((s0.pplUI || {}).editId || (s0.pplUI || {}).creating),
        heading: (s0.pplUI || {}).editId ? 'Rediger person' : 'Ny person',
        name: (s0.pplUI || {}).name || '',
        onName: (e) => this.setState({ pplUI: Object.assign({}, s0.pplUI, { name: e.target.value }) }),
        email: (s0.pplUI || {}).email || '',
        onEmail: (e) => this.setState({ pplUI: Object.assign({}, s0.pplUI, { email: e.target.value }) }),
        swatches: SWATCH.map(c => ({ color: c, ring: (s0.pplUI || {}).color === c ? '#231F20' : 'transparent',
          onClick: () => this.setState({ pplUI: Object.assign({}, s0.pplUI, { color: c }) }) })),
        onNew: () => this.setState({ pplUI: { open: true, creating: true, name: '', email: '', color: SWATCH[0] } }),
        onSave: () => this.savePerson(),
        onClose: () => this.setState({ pplUI: null }),
        canTeams: !!this.props.saveTeamsUrl,
        teamsStatus: TEAMS() ? 'Forbundet' : 'Ikke forbundet',
        teamsStatusColor: TEAMS() ? '#123C2F' : '#9C160D',
        teamsDraft: s0.teamsDraft || '',
        onTeamsDraft: (e) => this.setState({ teamsDraft: e.target.value }),
        onTeamsSave: () => { const u = (this.state.teamsDraft || '').trim();
          if (u && !/^https:\/\/[^\s]+$/.test(u)) { this.flash('Det ligner ikke en gyldig URL.'); return; }
          Promise.resolve(this.props.saveTeamsUrl(u)).then(() => { this.setState({ teamsDraft: '' }); this.flash(u ? 'Teams-forbindelsen er gemt.' : 'Teams-forbindelsen er fjernet.'); })
            .catch((e) => this.flash('Kunne ikke gemme: ' + ((e && e.message) || e))); },
        hasRequests: !!this.props.isAdmin && (s0.accessList || []).some(a => a.status === 'pending'),
        requests: !this.props.isAdmin ? [] : (s0.accessList || []).filter(a => a.status === 'pending').map(a => {
          const link = (s0.reqLink || {})[a.uid] || (s0.people.find(p => !p.uid && p.email && p.email.toLowerCase() === (a.email || '').toLowerCase()) || {}).id || 'new';
          return { name: a.name || a.email, email: a.email, link,
            opts: [{ id: 'new', name: 'Ny person' }].concat(s0.people.filter(p => !p.uid).map(p => ({ id: p.id, name: 'Er ' + p.name }))),
            onLink: (e) => this.setState({ reqLink: Object.assign({}, s0.reqLink, { [a.uid]: e.target.value }) }),
            onApprove: () => this.approveAccess(a, link),
            onReject: () => { this.props.setAccess(a.uid, { status: 'rejected' }); this.flash((a.name || a.email) + ' er afvist.'); } }; })
      } : null,
      onUndo: () => this.undo(),
      sortOpts: [['prio','Prioritet'],['dato','Dato'],['tid','Tid']].map(o => {
        const on = s0.sortBy === o[0];
        return { label: o[1], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F',
          border: on ? '#231F20' : '#DFDBD3', onClick: () => this.setState({ sortBy: o[0] }) }; }),
      sortNote: { prio: 'Høj prioritet først, så nærmeste dato', dato: 'Nærmeste dato først',
        tid: 'Største estimat først' }[s0.sortBy],
      meRow: { name: me.name, initials: me.initials, color: me.color },
      teamBadge: (() => { const n = this.props.isAdmin ? (s0.accessList || []).filter(a => a.status === 'pending').length : 0; return n ? ' · ' + n : ''; })(),
      teamColor: this.props.isAdmin && (s0.accessList || []).some(a => a.status === 'pending') ? '#ED571C' : '#6E675F',
      onLogout: () => { if (this.props.onLogout) this.props.onLogout(); },
      weekLabel: (() => { const w = this.weekDays(), a = parse(w[0]), b = parse(w[4]);
        const wk = (() => { const d = new Date(Date.UTC(a.getFullYear(), a.getMonth(), a.getDate() + 3)); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d - y0) / 86400000 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7); })();
        return 'Uge ' + wk + ' · ' + a.getDate() + '.' + (a.getMonth() !== b.getMonth() ? ' ' + MONTH[a.getMonth()] : '') + '–' + b.getDate() + '. ' + MONTH[b.getMonth()] + ' ' + b.getFullYear(); })(),
      isDay: s.view === 'dag', isInbox: s.view === 'inbox', isBoard: s.view === 'board',
      isLob: s.view === 'lob', isCal: s.view === 'kal', isTable: s.view === 'tabel', isGantt: s.view === 'gantt', isTime: s.view === 'tid', isDash: s.view === 'dash',
      toast: s.toast
    };
    const titles = {
      dag: ['Min dag', me.name + ' · ' + WDLONG[parse(TODAY).getDay()] + ' den ' + parse(TODAY).getDate() + '. ' + MONTH[parse(TODAY).getMonth()] + ' ' + TODAY.slice(0, 4)],
      inbox: ['Indbakke', unread + ' ulæste · afhængigheder, omtaler og påmindelser'],
      tabel: ['Opgaver', 'Alle ' + s.tasks.length + ' aktive opgaver · gruppér som du vil'],
      gantt: ['Tidslinje', 'Afhængigheder og kritisk vej'],
      lob: ['Løbende arbejde', 'Faste opgaver uden deadline · tid registreres, men de står ikke i to do'],
      kal: ['Kalender', 'Opgaver efter deadline · dine egne åbne checklistepunkter står lysere'],
      board: ['Board', 'Én bane pr. person, søjler efter status'],
      tid: ['Tid', 'Registrering, estimat og afvigelse'],
      dash: ['Overblik', 'Afdelingens opgaver og tidsforbrug']
    };
    v.viewTitle = titles[s.view][0]; v.viewSub = titles[s.view][1];

    if (s.timerTask) {
      const t = this.T(s.timerTask), el = Math.floor((Date.now() - s.timerStart) / 1000);
      v.timer = { title: t.title, clock: d2(Math.floor(el / 3600)) + ':' + d2(Math.floor(el / 60) % 60) + ':' + d2(el % 60), onStop: () => this.toggleTimer(t.id) };
    } else v.timer = null;

    // Min dag
    const myItem = t => t.checklist.filter(c => c.by === s.me && !c.done)[0] || null;
    const mine = s.tasks.filter(t => t.status === 'gang' && (t.owner === s.me || myItem(t)));
    const keyDate = t => t.planned || (t.owner === s.me ? t.due : ((myItem(t) || {}).due || t.due));
    const dcmp = (x, y) => (keyDate(x) ? (keyDate(y) ? dayDiff(keyDate(x), keyDate(y)) : -1) : (keyDate(y) ? 1 : 0));
    const sorters = {
      prio: (x, y) => PRIO[x.prio].rank - PRIO[y.prio].rank || dcmp(x, y),
      dato: (x, y) => dcmp(x, y) || PRIO[x.prio].rank - PRIO[y.prio].rank,
      tid:  (x, y) => (y.est - x.est) || dcmp(x, y)
    };
    const byPrio = a => a.slice().sort((x, y) => (sorters[s.sortBy] || sorters.prio)(x, y) || x.title.localeCompare(y.title, 'da'));
    const wd0 = (new Date(TODAY + 'T12:00:00').getDay() + 6) % 7; // man=0 … søn=6
    const EOW = 6 - wd0, EONW = EOW + 7;
    const used = {};
    const take = f => { const r = mine.filter(t => !used[t.id] && f(t)); r.forEach(t => used[t.id] = 1); return r; };
    const over   = take(t => keyDate(t) && dayDiff(keyDate(t), TODAY) < 0);
    const today  = take(t => keyDate(t) && dayDiff(keyDate(t), TODAY) === 0);
    const weekT  = take(t => keyDate(t) && dayDiff(keyDate(t), TODAY) > 0 && dayDiff(keyDate(t), TODAY) <= EOW);
    const nextW  = take(t => keyDate(t) && dayDiff(keyDate(t), TODAY) > EOW && dayDiff(keyDate(t), TODAY) <= EONW);
    const later  = take(t => true);
    const sect = (title, ts, note, color) => ({ title, note, color, count: ts.length,
      tasks: byPrio(ts).map(x => { const c = this.card(x);
        if (x.owner !== s.me) { const it = myItem(x);
          c.itemNote = (it ? it.text : '') + ' · ' + this.U(x.owner).name; }
        return c; }) });
    v.daySections = [
      sect('Over tid', over, '', '#9C160D'),
      sect('I dag', today, '', '#231F20'),
      sect('Resten af ugen', weekT, '', '#0031EB'),
      sect('Næste uge', nextW, '', '#231F20'),
      sect('Senere', later, '', '#6E675F')
    ].filter(x => x.count);;

    const hb = s.notes.filter(n => n.to === s.me && !n.read && n.kind === 'handoff')[0];
    const isMine = (t) => t.owner === s0.me || (t.members || []).indexOf(s0.me) >= 0;
    const ong = s0.tasks.filter(t => t.ongoing && !this.hiddenFor(t) && !this.archived(t))
      .sort((x, y) => (s0.timerTask === y.id) - (s0.timerTask === x.id) || isMine(y) - isMine(x) || x.title.localeCompare(y.title, 'da')).slice(0, 8);
    v.ongoingShow = true;
    v.ongoingEmpty = ong.length === 0;
    v.onOpenLob = () => this.setState({ view: 'lob' });
    const wk0 = this.weekDays();
    v.lobRows = s0.tasks.filter(t => t.ongoing && !this.hiddenFor(t) && !this.archived(t) && (!s0.projFilter || this.inArea(t, s0.projFilter)) && (!mineOnly || t.owner === s0.me || (t.members || []).indexOf(s0.me) >= 0))
      .sort((x, y) => x.title.localeCompare(y.title, 'da')).map(t => { const on = s0.timerTask === t.id, o = this.U(t.owner);
        const wkH = (who) => s0.entries.filter(e => e[0] === t.id && (!who || e[1] === who) && e[2] >= wk0[0] && e[2] <= addDays(wk0[0], 6)).reduce((a, e) => a + e[3], 0);
        const mine = wkH(s0.me) + (on ? (Date.now() - s0.timerStart) / 3600000 : 0), all = wkH(null) + (on ? (Date.now() - s0.timerStart) / 3600000 : 0);
        return { title: t.title, color: this.P(t.project).color, area: this.P(t.project).name, initials: o.initials, ownerColor: o.color,
          mine: on ? this.card(t).runLabel : (mine ? hrs(mine) : '–'), mineColor: on ? '#0031EB' : (mine ? '#231F20' : '#C9C4BA'), team: all ? hrs(all) : '–',
          icon: on ? '■' : '▶', border: on ? '#0031EB' : '#DFDBD3', bg: on ? '#0031EB' : '#fff', fg: on ? '#fff' : '#6E675F',
          onOpen: () => this.open(t.id), onTimer: (e) => { if (e) e.stopPropagation(); this.toggleTimer(t.id); } }; });
    v.lobEmpty = v.lobRows.length === 0;
    v.ongoing = ong.map(t => { const on = s0.timerTask === t.id;
      const h = s0.entries.filter(e => e[0] === t.id && e[1] === s0.me && e[2] === TODAY).reduce((a, e) => a + e[3], 0) + (on ? (Date.now() - s0.timerStart) / 3600000 : 0);
      return { title: t.title, color: this.P(t.project).color, time: on ? this.card(t).runLabel : (h ? hrs(h) : ''), timeColor: on ? '#0031EB' : '#9C948B',
        icon: on ? '■' : '▶', timerTitle: on ? 'Stop' : 'Start tid', border: on ? '#0031EB' : '#DFDBD3', bg: on ? '#0031EB' : '#fff', fg: on ? '#fff' : '#6E675F',
        onOpen: () => this.open(t.id), onTimer: () => this.toggleTimer(t.id) }; });
    v.stickies = s0.stickies.filter(n => n.by === s0.me || n.shared).map(n => {
      const own = n.by === s0.me;
      return { text: n.text, when: WH(n),
        badge: own ? (n.shared ? 'Delt med teamet' : 'Kun dig') : 'Delt af ' + this.U(n.by).name,
        badgeColor: own ? (n.shared ? '#0031EB' : '#9C948B') : '#9C160D',
        bg: own ? (n.shared ? '#EDF1FD' : '#F7F5F1') : '#FDEFE6',
        border: own ? (n.shared ? '#CFDCF7' : '#E4E0D8') : '#F4C7AC',
        own, shareLabel: n.shared ? 'Gør privat' : 'Del med teamet',
        onShare: () => this.shareNote(n.id), onDelete: () => this.delNote(n.id) }; });
    v.noteDraft = s0.noteDraft;
    v.onNoteChange = (e) => this.setState({ noteDraft: e.target.value });
    v.onNoteKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.addNote(s0.noteDraft); } };
    v.onNoteAdd = () => this.addNote(s0.noteDraft);

    v.handoffBanner = hb ? { text: hb.title + ' — ' + hb.body, onOpen: () => this.open(hb.task),
      onDismiss: (e) => { if (e) e.stopPropagation();
        this.setState({ notes: s0.notes.map(x => x.id === hb.id ? Object.assign({}, x, { read: true }) : x) }); } } : null;

    const week = this.weekDays(), dayNames = ['Man','Tir','Ons','Tor','Fre'];
    const hOn = (dt, p) => s.entries.filter(e => e[1] === p && e[2] === dt).reduce((a, e) => a + e[3], 0);
    const running = s.timerTask ? (Date.now() - s.timerStart) / 3600000 : 0;
    const todayH = hOn(TODAY, s.me) + (s.timerTask ? running : 0);
    v.todayHours = hrs(todayH); v.todayPct = Math.min(100, todayH / 7.5 * 100) + '%'; v.todayRemain = hrs(Math.max(0, 7.5 - todayH));
    v.weekBars = week.map((dt, i) => { const h = hOn(dt, s.me) + (dt === TODAY && s.timerTask ? running : 0);
      return { day: dayNames[i], hours: h ? num(h) : '–', pct: (h / 7.5 * 100) + '%',
        color: dt === TODAY ? '#0031EB' : '#9FC4DB', labelColor: dt === TODAY ? '#231F20' : '#6E675F', weight: dt === TODAY ? 600 : 400 }; });

    // Indbakke
    v.inboxItems = s.notes.filter(n => n.to === s.me).map(n => ({
      tag: n.tag, title: n.title, body: n.body, time: WH(n), channel: TEAMS() ? (n.channel || null) : null,
      bg: n.read ? '#fff' : '#FCFCFE', weight: n.read ? 400 : 600, dot: n.read ? '#DFDBD3' : '#0031EB',
      tagColor: n.kind === 'handoff' ? '#fff' : (n.kind === 'stale' ? '#9C160D' : '#4A443F'),
      tagBg: n.kind === 'handoff' ? '#0031EB' : (n.kind === 'stale' ? '#FDEFE6' : '#E9E6E0'),
      onOpen: () => this.open(n.task) }));

    // Opgaver (tabel)
    v.groupModes = [['maaned','Måned'],['omraade','Område'],['person','Person'],['status','Status']].map(g => ({
      label: g[1], onClick: () => this.setState({ group: g[0] }),
      bg: s.group === g[0] ? '#231F20' : '#fff', color: s.group === g[0] ? '#fff' : '#4A443F', border: s.group === g[0] ? '#231F20' : '#DFDBD3' }));
    const PRESETS = {
      aktive: { ide: 1, pipeline: 1, pplads: 1, faerdig: 1 },
      hvile: { gang: 1, review: 1, faerdig: 1 },
      faerdige: { ide: 1, pipeline: 1, gang: 1, pplads: 1, review: 1 },
      alle: {}
    };
    const sameOff = a => ORDER.every(k => !!a[k] === !!s.statusOff[k]);
    const cnt = ks => s.tasks.filter(t => ks.indexOf(t.status) >= 0).length;
    v.scopes = [
      { key: 'aktive', label: 'I gang', count: cnt(['gang','review']) },
      { key: 'hvile', label: 'Ikke i gang', count: cnt(['ide','pipeline','pplads']) },
      { key: 'faerdige', label: 'Færdige', count: cnt(['faerdig']) },
      { key: 'alle', label: 'Alle', count: s.tasks.length }
    ].map(o => { const on = sameOff(PRESETS[o.key]);
      return { label: o.label, count: o.count, onClick: () => this.setState({ statusOff: Object.assign({}, PRESETS[o.key]) }),
        bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F' }; });

    v.statusChips = ORDER.map(k => { const off = !!s.statusOff[k], st = STATUS[k];
      return { label: st.label, count: s.tasks.filter(t => t.status === k).length,
        dot: off ? '#C9C4BA' : st.dot, bg: off ? '#FAF9F6' : st.bg, color: off ? '#B4B4BE' : st.color,
        border: off ? '#EFEFF2' : st.dot, deco: off ? 'line-through' : 'none',
        onClick: () => this.setState({ statusOff: Object.assign({}, s.statusOff, { [k]: off ? 0 : 1 }) }) }; });

    const pool = s.tasks.filter(t => !s.statusOff[t.status]);
    const keyFns = {
      maaned: t => t.due ? t.due.slice(0, 7) : 'zzz',
      omraade: t => t.project,
      person: t => t.owner,
      status: t => t.status
    };
    const labelFns = {
      maaned: k => k === 'zzz' ? 'Idébank — ingen dato' : (MONTH[parseInt(k.slice(5, 7), 10) - 1].charAt(0).toUpperCase() + MONTH[parseInt(k.slice(5, 7), 10) - 1].slice(1) + ' ' + k.slice(0, 4)),
      omraade: k => this.P(k).name, person: k => this.U(k).name, status: k => STATUS[k].label
    };
    const colorFns = {
      maaned: k => k === 'zzz' ? '#C9C4BA' : '#0031EB',
      omraade: k => this.P(k).color, person: k => this.U(k).color, status: k => STATUS[k].dot
    };
    const kf = keyFns[s.group];
    const order = [];
    pool.forEach(t => { const k = kf(t); if (order.indexOf(k) < 0) order.push(k); });
    if (s.group === 'maaned') order.sort();
    if (s.group === 'status') order.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    v.tableGroups = order.map(k => {
      const ts = byPrio(pool.filter(t => kf(t) === k));
      const late = ts.filter(t => t.due && t.status !== 'faerdig' && dayDiff(t.due, TODAY) < 0).length;
      const open = ts.filter(t => t.status !== 'faerdig' && t.status !== 'ide').length;
      const isPast = s.group === 'maaned' && k !== 'zzz' && k < TODAY.slice(0, 7);
      return { name: labelFns[s.group](k), color: colorFns[s.group](k),
        count: ts.length + ' opgaver · ' + open + ' aktive',
        warn: late ? late + ' over deadline' : null,
        hours: num(ts.reduce((a, t) => a + this.liveSpent(t), 0)) + ' / ' + num(ts.reduce((a, t) => a + t.est, 0)) + ' t',
        headBg: isPast ? '#E4E0D8' : '#F7F5F1', textColor: '#231F20',
        caret: s.collapsed[k] ? '▶' : '▼',
        onToggle: () => this.setState({ collapsed: Object.assign({}, s.collapsed, { [k]: !s.collapsed[k] }) }),
        tasks: s.collapsed[k] ? [] : ts.map(t => this.card(t)) };
    });
    v.tableSummary = pool.length + ' opgaver vist af ' + s.tasks.length;
    v.archiveNote = this.archivedCount() ? this.archivedCount() + ' færdige opgaver er arkiveret automatisk efter 30 dage. De tæller stadig med i tidsforbrug og historik.' : null;

    // Board
    v.lanes = s.people.map(u => {
      const ts = s.tasks.filter(t => t.owner === u.id);
      const openT = ts.filter(t => t.status !== 'faerdig' && t.status !== 'ide');
      const tot = openT.length || 1;
      return { name: u.name, initials: u.initials, color: u.color, tint: u.color + '12',
        load: openT.length + ' aktive · ' + hrs(openT.reduce((a, t) => a + t.est, 0)) + ' estimeret',
        mix: ORDER.filter(c => c !== 'faerdig' && c !== 'ide').map(c => ({
          w: (ts.filter(t => t.status === c).length / tot * 100) + '%', color: STATUS[c].dot })),
        columns: ORDER.map(c => { const ct = byPrio(ts.filter(t => t.status === c));
          return { title: STATUS[c].label, color: STATUS[c].dot, headBg: STATUS[c].bg, headColor: STATUS[c].color,
            count: ct.length, empty: ct.length === 0,
            tasks: ct.map(t => { const card = this.card(t);
              const done = t.checklist.filter(x => x.done).length;
              card.prog = t.checklist.length ? (done / t.checklist.length * 100) + '%' : null;
              card.progColor = STATUS[t.status].dot;
              card.dots = (t.labels || []).map(id => this.L(id)).filter(Boolean).map(l => ({ color: l.color }));
              card.hot = t.prio === 'hoej';
              card.tint = t.prio === 'hoej' ? '#FDF1EA' : '#fff';
              return card; }) }; }) };
    });

    // Tidslinje
    const g0 = addDays(this.weekDays()[0], -21), span = 84;
    const pos = dt => Math.max(0, Math.min(100, dayDiff(dt, g0) / span * 100));
    v.ganttWeeks = [0,1,2,3,4,5,6,7,8,9,10,11].map(i => { const dt = new Date(parse(g0).getTime() + i * 7 * 86400000);
      const iso = dt.getFullYear() + '-' + d2(dt.getMonth() + 1) + '-' + d2(dt.getDate());
      return { label: fmt(iso), weight: i === 3 ? 600 : 400 }; });
    v.ganttGrid = [0,1,2,3,4,5,6,7,8,9,10,11].map(i => ({ left: (i / 12 * 100) + '%' }));
    v.ganttToday = pos(TODAY) + '%';
    const rows = [], bars = [], idx = {};
    s.projects.forEach(p => {
      const ts = s.tasks.filter(t => t.project === p.id && t.start && t.due && t.status !== 'faerdig' && dayDiff(t.due, g0) >= 0 && dayDiff(t.start, g0) <= span)
        .sort((a, b) => dayDiff(a.start, b.start));
      if (!ts.length) return;
      rows.push({ label: p.name, dotColor: p.color, pad: '14px', size: '12.5px', weight: 600, font: 'Archivo,sans-serif', cursor: 'default', rowBg: '#FAF9F6', textColor: '#231F20', onOpen: null });
      ts.forEach(t => {
        idx[t.id] = rows.length;
        rows.push({ label: t.title, dotColor: null, pad: '30px', size: '12px', weight: 400, font: "'Instrument Sans',sans-serif", cursor: 'pointer', rowBg: '#fff', textColor: '#231F20', onOpen: () => this.open(t.id) });
        const st = t.status;
        const bg = st === 'gang' ? '#0031EB' : st === 'pplads' ? '#F4C7AC' : st === 'review' ? '#DCEAF7' : '#DCE6F6';
        const bd = st === 'gang' ? '#0031EB' : st === 'pplads' ? '#E0A882' : st === 'review' ? '#8FC4E8' : '#9FC4DB';
        const tx = st === 'gang' ? '#fff' : st === 'pplads' ? '#9C160D' : st === 'review' ? '#1C6FA8' : '#123C2F';
        bars.push({ left: pos(t.start) + '%', width: Math.max(1.4, pos(t.due) - pos(t.start) + 100 / span) + '%',
          top: ((rows.length - 1) * 32 + 7) + 'px', bg, border: bd, text: tx, label: t.title, onOpen: () => this.open(t.id) });
      });
    });
    const links = [];
    s.tasks.forEach(t => t.deps.forEach(dep => {
      const a = this.T(dep); if (!a || idx[a.id] === undefined || idx[t.id] === undefined) return;
      const x1 = pos(a.due) + 100 / span, x2 = pos(t.start);
      const y1 = idx[a.id] * 32 + 16, y2 = idx[t.id] * 32 + 16;
      links.push({ left: x1 + '%', top: Math.min(y1, y2) + 'px', w: '1px', h: Math.abs(y2 - y1) + 'px' });
      links.push({ left: x1 + '%', top: y2 + 'px', w: Math.max(0.4, x2 - x1) + '%', h: '1px' });
    }));
    v.ganttRows = rows; v.ganttBars = bars; v.ganttLinks = links;

    // Kalender
    if (s.view === 'kal') {
      const mode = s0.calMode || 'maaned', showDone = !!s0.calDone; let doneN = 0;
      const anchor = s0.calAnchor || TODAY, a = parse(anchor);
      const monOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
      let start, weeksN, cols;
      if (mode === 'uge') { start = monOf(a); weeksN = 1; cols = 5; }
      else { const f = new Date(a.getFullYear(), a.getMonth(), 1), l = new Date(a.getFullYear(), a.getMonth() + 1, 0);
        start = monOf(f); weeksN = Math.ceil((dayDiff(isoOf(l), isoOf(start)) + 1) / 7); cols = 7; }
      const dayTasks = {}, dayItems = {};
      s.tasks.forEach(t => { if (!t.due || this.archived(t)) return; if (t.status === 'faerdig' && !showDone) { (dayTasks['done:' + t.due] = dayTasks['done:' + t.due] || []).push(t); return; } (dayTasks[t.due] = dayTasks[t.due] || []).push(t); });
      s0.tasks.forEach(t => { if (this.hiddenFor(t) || this.archived(t) || (s0.projFilter && !this.inArea(t, s0.projFilter))) return;
        (t.checklist || []).forEach((c, i) => { if (c.by !== s0.me || !c.due || c.done) return; (dayItems[c.due] = dayItems[c.due] || []).push({ t, c, i }); }); });
      // i arbejdsugen lægges weekendens ting på fredag
      const fold = (map, d0) => { const out = (map[d0] || []).slice(); if (mode === 'uge' && parse(d0).getDay() === 5) [1, 2].forEach(k => { out.push(...(map[addDays(d0, k)] || [])); }); return out; };
      const MAXM = 4;
      const mkTask = t => { const p = this.P(t.project), o = this.U(t.owner), done = t.status === 'faerdig';
        return { title: t.title, color: p.color, initials: o.initials, ownerColor: o.color, prio: t.prio === 'hoej' ? '!' : null,
          statusDot: STATUS[t.status].dot, statusLabel: STATUS[t.status].label, textColor: done ? '#9C948B' : '#231F20', deco: done ? 'line-through' : 'none',
          tip: t.title + ' · ' + p.name + ' · ' + o.name + ' · ' + STATUS[t.status].label, onOpen: () => this.open(t.id) }; };
      const mkItem = x => ({ text: x.c.text || 'Punkt', parent: x.t.title, color: this.P(x.t.project).color,
        tip: x.c.text + ' · ' + x.t.title, onOpen: () => this.open(x.t.id),
        onCheck: (e) => { if (e) e.stopPropagation(); this.toggleCheck(x.t.id, x.i); } });
      const weeks = [];
      for (let w = 0; w < weeksN; w++) {
        const days = [];
        for (let d = 0; d < cols; d++) {
          const dt = new Date(start); dt.setDate(dt.getDate() + w * 7 + d); const iso = isoOf(dt);
          const ts = byPrio(fold(dayTasks, iso)), its = fold(dayItems, iso);
          if (!(mode === 'maaned' && dt.getMonth() !== a.getMonth())) doneN += (dayTasks['done:' + iso] || []).length + (mode === 'uge' && dt.getDay() === 5 ? [1, 2].reduce((n, k) => n + (dayTasks['done:' + addDays(iso, k)] || []).length, 0) : 0);
          const other = mode === 'maaned' && dt.getMonth() !== a.getMonth();
          const cap = mode === 'maaned' ? MAXM : 99, more = Math.max(0, ts.length - cap) + (mode === 'maaned' ? Math.max(0, its.length - Math.max(0, cap - ts.length)) : 0);
          const shownT = ts.slice(0, cap), shownI = mode === 'maaned' ? its.slice(0, Math.max(0, cap - shownT.length)) : its;
          days.push({ num: mode === 'uge' ? '' : dt.getDate() + (dt.getDate() === 1 ? '. ' + MON[dt.getMonth()] : ''), wdColor: iso === TODAY ? '#0031EB' : '#4A443F', showNum: mode !== 'uge',
            wd: mode === 'uge' ? WDLONG[dt.getDay()].charAt(0).toUpperCase() + WDLONG[dt.getDay()].slice(1) + ' ' + dt.getDate() + '. ' + MON[dt.getMonth()] : '',
            isToday: iso === TODAY, numBg: iso === TODAY ? '#0031EB' : 'transparent', numColor: iso === TODAY ? '#fff' : (other ? '#C9C4BA' : '#231F20'),
            bg: other ? '#FAF9F6' : ((dt.getDay() === 0 || dt.getDay() === 6) ? '#FBFAF8' : '#fff'),
            minH: mode === 'uge' ? '440px' : '118px',
            tasks: shownT.map(mkTask), items: shownI.map(mkItem),
            more: more ? '+' + more + ' mere' : null,
            onMore: () => this.setState({ calMode: 'uge', calAnchor: iso }) });
        }
        weeks.push({ days });
      }
      const step = (n) => { const x = new Date(a); if (mode === 'uge') x.setDate(x.getDate() + 7 * n); else { x.setDate(1); x.setMonth(x.getMonth() + n); } return isoOf(x); };
      const wk = (() => { const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate() + 3)); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d - y0) / 86400000 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7); })();
      const endW = new Date(start); endW.setDate(endW.getDate() + 4);
      v.cal = {
        title: mode === 'uge' ? 'Uge ' + wk + ' · ' + start.getDate() + '. ' + (start.getMonth() !== endW.getMonth() ? MON[start.getMonth()] + ' ' : '') + '– ' + endW.getDate() + '. ' + MON[endW.getMonth()] + ' ' + endW.getFullYear()
          : MONTH[a.getMonth()].charAt(0).toUpperCase() + MONTH[a.getMonth()].slice(1) + ' ' + a.getFullYear(),
        modes: [['maaned', 'Måned'], ['uge', 'Arbejdsuge']].map(o => { const on = mode === o[0];
          return { label: o[1], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3', onClick: () => this.setState({ calMode: o[0] }) }; }),
        heads: (mode === 'uge' ? [] : ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']).map(x => ({ label: x })),
        showHeads: mode !== 'uge', cols: 'repeat(' + cols + ',minmax(0,1fr))',
        itemsLabel: showDone ? 'Skjul færdige' : 'Vis færdige' + (doneN ? ' (' + doneN + ')' : ''),
        onItems: () => this.setState({ calDone: !showDone }),
        onPrev: () => this.setState({ calAnchor: step(-1) }), onNext: () => this.setState({ calAnchor: step(1) }),
        onToday: () => this.setState({ calAnchor: TODAY }),
        weeks
      };
    } else v.cal = null;

    // Tid
    v.timeScopes = [['me','Mine timer'],['team','Hele teamet']].map(o => ({ label: o[1], onClick: () => this.setState({ timeScope: o[0] }),
      bg: s.timeScope === o[0] ? '#231F20' : '#fff', color: s.timeScope === o[0] ? '#fff' : '#4A443F', border: s.timeScope === o[0] ? '#231F20' : '#DFDBD3' }));
    v.weekCols = week.map((dt, i) => ({ label: dayNames[i] + ' ' + parse(dt).getDate() + '.', color: dt === TODAY ? '#231F20' : '#6E675F' }));
    const scoped = s.entries.filter(e => s.timeScope === 'me' ? e[1] === s.me : true);
    const tkey = (e) => (this.hiddenFor(this.T(e[0])) ? '__privat' : e[0]) + '|' + e[1];
    const keys = []; scoped.forEach(e => { const k = tkey(e); if (keys.indexOf(k) < 0) keys.push(k); });
    v.timeRows = keys.map(k => { const a = k.split('|'), priv = a[0] === '__privat';
      const t = priv ? { title: 'Privat', project: null } : (this.T(a[0]) || { title: 'Slettet opgave', project: null }), p = priv ? { color: '#C9C4BA' } : this.P(t.project);
      const cells = week.map(dt => { const h = scoped.filter(e => tkey(e) === k && e[2] === dt).reduce((x, e) => x + e[3], 0);
        return { v: h ? num(h) : '–', color: h ? '#231F20' : '#C9C4BA' }; });
      const tot = scoped.filter(e => tkey(e) === k).reduce((x, e) => x + e[3], 0);
      return { title: t.title, owner: s.timeScope === 'team' ? this.U(a[1]).name : null, projectColor: p.color, cells, total: num(tot) + ' t' }; });
    v.timeTotals = week.map(dt => { const h = scoped.filter(e => e[2] === dt).reduce((a, e) => a + e[3], 0); return { v: h ? num(h) : '–' }; });
    v.timeGrand = num(scoped.reduce((a, e) => a + e[3], 0)) + ' t';
    const varSrc = s.tasks.filter(t => !t.ongoing && this.liveSpent(t) > 0 && (s.timeScope === 'me' ? t.owner === s.me : true));
    const maxV = Math.max.apply(null, varSrc.map(t => Math.max(t.est, this.liveSpent(t))).concat([1]));
    v.varianceRows = varSrc.sort((a, b) => (this.liveSpent(b) - b.est) - (this.liveSpent(a) - a.est)).map(t => {
      const sp = this.liveSpent(t), over = sp > t.est;
      return { title: t.title, estPct: (t.est / maxV * 100) + '%', actPct: (sp / maxV * 100) + '%',
        color: over ? '#9C160D' : '#123C2F', numbers: num(sp) + ' brugt af ' + num(t.est) + ' t',
        delta: (over ? '+' : '') + num(sp - t.est) + ' t', onOpen: () => this.open(t.id) }; });

    // Overblik
    const openAll = s.tasks.filter(t => t.status !== 'faerdig' && t.status !== 'ide');
    const ideas = s.tasks.filter(t => t.status === 'ide');
    const overdue = openAll.filter(t => t.due && dayDiff(t.due, TODAY) < 0);
    const parkedAll = s.tasks.filter(t => t.status === 'pplads');
    const totSpent = s.tasks.reduce((a, t) => a + this.liveSpent(t), 0);
    const totEst = s.tasks.filter(t => this.liveSpent(t) > 0).reduce((a, t) => a + t.est, 0);
    v.kpis = [
      { label: 'Aktive opgaver', value: openAll.length, sub: ideas.length + ' idéer i banken · ' + this.archivedCount() + ' arkiveret', color: '#231F20' },
      { label: 'Over deadline', value: overdue.length, sub: overdue.length ? 'Ældste er ' + Math.max.apply(null, overdue.map(t => Math.abs(dayDiff(t.due, TODAY)))) + ' dage over' : 'Ingen', color: overdue.length ? '#9C160D' : '#123C2F' },
      { label: 'På P-pladsen', value: parkedAll.length, sub: 'Påbegyndt, men står stille', color: parkedAll.length ? '#9C160D' : '#123C2F' },
      { label: 'Afvigelse på tid', value: (totSpent > totEst ? '+' : '') + num(totSpent - totEst) + ' t', sub: num(totSpent) + ' brugt af ' + num(totEst) + ' t estimeret', color: totSpent > totEst ? '#9C160D' : '#123C2F' }
    ];
    v.capacity = s.people.map(u => {
      const h = openAll.filter(t => t.owner === u.id && t.status !== 'pplads' && t.due && dayDiff(t.due, this.weekDays()[4]) <= 0)
        .reduce((a, t) => a + Math.max(0, t.est - this.liveSpent(t)), 0);
      const pct = h / 37 * 100;
      return { name: u.name, initials: u.initials, color: u.color, label: num(h) + ' / 37 t',
        pct: Math.min(100, pct) + '%', statusColor: pct > 100 ? '#9C160D' : pct > 80 ? '#7A6047' : '#0031EB' };
    });
    const ptMax = Math.max.apply(null, s.projects.map(p => s.tasks.filter(t => t.project === p.id).reduce((a, t) => a + this.liveSpent(t), 0)).concat([1]));
    v.projectTime = s.projects.map(p => { const h = s.tasks.filter(t => t.project === p.id).reduce((a, t) => a + this.liveSpent(t), 0);
      return { name: p.name, color: p.color, hours: num(h) + ' t', pct: (h / ptMax * 100) + '%', raw: h }; })
      .sort((a, b) => b.raw - a.raw);
    v.statusDist = ORDER.map(c => { const n = s.tasks.filter(t => t.status === c).length;
      return { label: STATUS[c].label, color: STATUS[c].dot, count: n, pct: (n / s.tasks.length * 100) + '%', pctLabel: Math.round(n / s.tasks.length * 100) + '%' }; });
    const risk = [];
    overdue.sort((a, b) => dayDiff(a.due, b.due)).forEach(t => risk.push({ t, reason: Math.abs(dayDiff(t.due, TODAY)) + ' dage over deadline · ' + STATUS[t.status].label, color: '#9C160D' }));
    s.tasks.filter(t => t.est && this.liveSpent(t) > t.est && t.status !== 'faerdig').forEach(t => risk.push({ t, reason: 'Bruger ' + num(this.liveSpent(t) - t.est) + ' t mere end estimeret', color: '#7A6047' }));
    v.riskRows = risk.slice(0, 7).map(r => ({ title: r.t.title, reason: r.reason, color: r.color, owner: this.U(r.t.owner).name, onOpen: () => this.open(r.t.id) }));

    // Detaljepanel
    if (s.sel && this.T(s.sel)) {
      const t = this.T(s.sel), c = this.card(t), sp = this.liveSpent(t);
      const ck = t.checklist.filter(x => x.done).length;
      const succ = s.tasks.filter(x => x.deps.indexOf(t.id) >= 0);
      v.d = Object.assign({}, c, {
        onClose: () => this.setState({ sel: null }),
        onEdit: () => this.openEdit(t.id),
        onSaveTemplate: () => this.saveTemplate(t.id),
        hasItems: (t.checklist || []).length > 0, itemCount: (t.checklist || []).length,
        clearAsk: s0.clearAsk === t.id,
        onClearAsk: () => this.setState({ clearAsk: t.id }),
        onClearNo: () => this.setState({ clearAsk: null }),
        onClearYes: () => this.clearChecklist(t.id),
        desc: t.desc || null,
        planDays: this.weekDays().map(iso => { const on = t.planned === iso, today = iso === TODAY;
          return { label: WD[new Date(iso + 'T00:00:00').getDay()], day: +iso.slice(8, 10),
            bg: on ? '#231F20' : '#fff', color: on ? '#fff' : (today ? '#0031EB' : '#4A443F'),
            border: on ? '#231F20' : (today ? '#9FC4DB' : '#DFDBD3'),
            onClick: () => this.setPlanned(t.id, on ? null : iso) }; }),
        planNote: t.planned ? (t.planned === TODAY ? 'Planlagt til i dag' : 'Planlagt til ' + fmt(t.planned)) : 'Ikke planlagt — følger deadline',
        labels: (t.labels || []).map(id => this.L(id)).filter(l => l)
          .map(l => ({ name: l.name, color: l.color, bg: l.color + '1F' })),
        hasLabels: (t.labels || []).filter(id => this.L(id)).length > 0,
        members: (t.members || [t.owner]).map(id => { const u = this.U(id); return { initials: u.initials, color: u.color, name: u.name }; }),
        onPaste: (e) => this.onPasteTask(t.id, e),
        depPickOpen: s0.depPick === t.id,
        onDepPick: () => this.setState({ depPick: s0.depPick === t.id ? null : t.id }),
        depQuery: s0.depQuery || '',
        onDepQuery: (e) => this.setState({ depQuery: e.target.value }),
        depCandidates: s0.tasks.filter(x => x.id !== t.id && t.deps.indexOf(x.id) < 0 && x.status !== 'faerdig'
          && (!s0.depQuery || x.title.toLowerCase().indexOf(s0.depQuery.toLowerCase()) >= 0)).slice(0, 6)
          .map(x => ({ title: x.title, owner: this.U(x.owner).name, color: this.P(x.project).color,
            onClick: () => { this.patch(t.id, { deps: t.deps.concat([x.id]) });
              this.setState({ depPick: null, depQuery: '' });
              this.flash('“' + t.title + '” er nu afhængig af “' + x.title + '”.'); } })),
        files: (t.files || []).map((f, i) => ({ name: f.name, size: f.size, kind: f.kind,
          isLink: f.kind === 'LINK', url: f.url || null,
          tileBg: f.kind === 'LINK' ? '#EDF1FD' : '#E9E6E0', tileColor: f.kind === 'LINK' ? '#0031EB' : '#6E675F',
          tileLabel: f.kind === 'LINK' ? '🔗' : f.kind,
          sub: f.kind === 'LINK' ? f.url : (f.size + ' · ' + WH(f)),
          onOpen: () => { if (f.url) window.open(f.url, '_blank'); },
          meta: f.size + ' · ' + this.U(f.by).name + ' · ' + WH(f),
          onDelete: (e) => { if (e) e.stopPropagation(); this.delFile(t.id, i); } })),
        fileCount: (t.files || []).length ? (t.files.length + ' filer') : null,
        onAttach: () => this.pickFiles(t.id),
        onDropFiles: (e) => this.onDrop(t.id, e),
        onDragOver: (e) => e.preventDefault(),
        blocked: this.blockedText(t),
        statusOptions: ORDER.map(k => ({ label: STATUS[k].label, onClick: () => this.setStatus(t.id, k),
          bg: t.status === k ? STATUS[k].bg : '#fff', color: t.status === k ? STATUS[k].color : '#6E675F', border: t.status === k ? STATUS[k].dot : '#DFDBD3' })),
        prioOptions: ['hoej','normal','lav'].map(k => ({ label: PRIO[k].label, onClick: () => this.setPrio(t.id, k),
          bg: t.prio === k ? '#231F20' : '#fff', color: t.prio === k ? '#fff' : '#6E675F', border: t.prio === k ? '#231F20' : '#DFDBD3' })),
        period: t.start && t.due ? fmt(t.start) + ' – ' + fmt(t.due) : 'Ikke planlagt',
        spentPct: Math.min(100, sp / Math.max(t.est || 1, sp) * 100) + '%',
        checkProgress: t.checklist.length ? ck + ' af ' + t.checklist.length : null,
        showDone: !!s0.showDoneItems,
        doneToggleLabel: s0.showDoneItems ? 'Skjul færdige' : 'Vis færdige',
        onToggleDone: () => this.setState({ showDoneItems: !s0.showDoneItems }),
        hasDoneItems: t.checklist.filter(x => x.done).length > 0,
        doneCount: t.checklist.filter(x => x.done).length + ' færdige skjult',
        checklist: t.checklist.map((x, i) => ({ x, i })).filter(o => s0.showDoneItems || !o.x.done).map(o => o.x).map((x, ii, arr) => {
          const i = t.checklist.indexOf(x); const o = this.U(x.by), late = x.due && !x.done && dayDiff(x.due, TODAY) < 0;
          const b = this.blocker(t, x), warnOn = s.warn === t.id + ':' + i;
          const dep = x.after ? t.checklist.filter(y => y.id === x.after)[0] : null;
          return { text: x.text, mark: x.done ? '✓' : '',
            border: x.done ? '#123C2F' : (b ? '#DFDBD3' : '#C9C4BA'), fill: x.done ? '#123C2F' : 'transparent',
            color: x.done ? '#9C948B' : (b ? '#6E675F' : '#231F20'), deco: x.done ? 'line-through' : 'none',
            ownerInitials: o.initials, ownerColor: x.done ? '#C9C4BA' : o.color,
            due: x.due ? fmt(x.due) : '–', dueColor: x.done ? '#C9C4BA' : (late ? '#9C160D' : '#6E675F'),
            value: x.text, onText: (e) => this.patchItem(t.id, i, { text: e.target.value }),
            byValue: x.by, onBy: (e) => this.patchItem(t.id, i, { by: e.target.value }),
            dueValue: x.due || '', onDue: (e) => this.patchItem(t.id, i, { due: e.target.value || null }),
            indent: x.after ? '22px' : '0px', hasDep: !!x.after,
            dateShow: !!x.due || s0.dateEdit === t.id + ':c' + i,
            dateEmpty: !x.due && s0.dateEdit !== t.id + ':c' + i,
            onDateOpen: (e) => { if (e) e.stopPropagation(); this.setState({ dateEdit: t.id + ':c' + i }); },
            depNote: dep ? 'Afhængig af: ' + dep.text + (b ? ' · ' + this.U(dep.by).name : '') : null,
            depColor: b ? '#9C160D' : '#9C948B',
            chainColor: b ? '#9C160D' : (x.after ? '#0031EB' : '#6E675F'),
            chainBorder: b ? '#F4C7AC' : (x.after ? '#CFDCF7' : '#DFDBD3'),
            chainBg: b ? '#FDEFE6' : (x.after ? '#F0F4FE' : '#fff'),
            onPromote: (e) => { if (e) e.stopPropagation(); this.promoteItem(t.id, i); },
            onDelete: (e) => { if (e) e.stopPropagation(); this.deleteItem(t.id, i); },
            onChain: (e) => { if (e) e.stopPropagation();
              this.setState({ itemDep: s0.itemDep === t.id + ':' + i ? null : t.id + ':' + i }); },
            depRowOpen: s0.itemDep === t.id + ':' + i,
            afterValue: x.after || '',
            onAfterChange: (e) => { this.patchItem(t.id, i, { after: e.target.value || null }); this.setState({ itemDep: null }); },
            afterOpts: [{ id: '', name: 'Ingen' }].concat(
              t.checklist.filter((o, j) => j !== i).map(o => ({ id: o.id, name: o.text.slice(0, 46) }))),
            warnOn, warnText: b ? 'Punktet er afhængigt af “' + b.text + '”. Er du sikker på, du vil markere det som færdigt?' : '',
            onConfirm: (e) => { if (e) e.stopPropagation(); this.toggleCheck(t.id, i, true); },
            onCancelWarn: (e) => { if (e) e.stopPropagation(); this.setState({ warn: null }); },
            onToggle: () => this.toggleCheck(t.id, i) }; }),
        deps: t.deps.map(id => { const a = this.T(id); return { rel: 'Afhængig af', title: a.title, statusLabel: STATUS[a.status].label,
            statusColor: STATUS[a.status].color, statusBg: STATUS[a.status].bg, color: this.P(a.project).color,
            owner: this.U(a.owner).name, due: a.due ? fmt(a.due) : '–',
            onOpen: () => this.drill(a.id),
            onRemove: (e) => { if (e) e.stopPropagation(); this.patch(t.id, { deps: t.deps.filter(x => x !== a.id) }); } }; })
          .concat(succ.map(a => ({ rel: 'Blokerer', title: a.title, statusLabel: STATUS[a.status].label,
            statusColor: STATUS[a.status].color, statusBg: STATUS[a.status].bg, color: this.P(a.project).color,
            owner: this.U(a.owner).name, due: a.due ? fmt(a.due) : '–',
            onOpen: () => this.drill(a.id), onRemove: null }))),
        subtasks: s0.tasks.filter(x => x.parent === t.id).map(a => ({
          title: a.title, statusLabel: STATUS[a.status].label, statusColor: STATUS[a.status].color,
          statusBg: STATUS[a.status].bg, color: this.P(a.project).color, owner: this.U(a.owner).name,
          due: a.due ? fmt(a.due) : '–', onOpen: () => this.drill(a.id), onRemove: null })),
        hasSubtasks: s0.tasks.filter(x => x.parent === t.id).length > 0,
        parentName: t.parent && this.T(t.parent) ? this.T(t.parent).title : null,
        onParent: () => this.drill(t.parent),
        backShow: (s0.trail || []).length > 0,
        backTitle: (s0.trail || []).length ? 'Tilbage til “' + this.T(s0.trail[s0.trail.length - 1]).title + '”' : '',
        onBack: () => this.back(),
        notifyNext: succ.length
          ? 'Når denne markeres færdig, får ' + succ.map(a => this.U(a.owner).name).filter((x, i, a2) => a2.indexOf(x) === i).join(' og ') + ' automatisk besked ' + VIA() + ' om at overtage.'
          : null,
        activity: (t.log || []).map(a => { const u = this.U(a.by) || { initials: '?', color: '#9C948B' };
            return { initials: u.initials, color: u.color, text: a.text, when: relTime(a.ts) }; })
          .concat([(() => { const u = this.U(t.createdBy || t.owner) || { initials: '?', color: '#9C948B' };
            return { initials: u.initials, color: u.color, text: t.imported ? 'Importeret fra ' + t.imported : 'Oprettede opgaven', when: t.created ? relTime(t.created) : 'tidligere' }; })()]),
        completeLabel: t.status === 'faerdig' ? 'Genåbn opgave' : 'Markér som færdig',
        completeBg: t.status === 'faerdig' ? '#6E675F' : '#123C2F',
        dirty: !!t.dirty,
        onPublish: () => this.publish(t.id),
        onTitle: (e) => this.patch(t.id, { title: e.target.value }),
        onDesc: (e) => this.patch(t.id, { desc: e.target.value }),
        descValue: t.desc || '',
        descRows: Math.min(10, Math.max(2, Math.ceil((t.desc || '').length / 62) + ((t.desc || '').split('\n').length - 1))),
        onOwnerChange: (e) => { const o = e.target.value;
          this.patch(t.id, { owner: o, members: t.members.indexOf(o) >= 0 ? t.members : t.members.concat([o]) }); },
        peopleOpts: s.people.map(u => ({ id: u.id, name: u.name })),
        projectValue: t.project,
        onProjectChange: (e) => this.patch(t.id, { project: e.target.value }),
        projectOpts: s0.projects.map(p => ({ id: p.id, name: p.name })),
        showMembers: !t.private && ((t.members || []).filter(m => m !== t.owner).length > 0 || s0.memberPicker === t.id),
        showAddMember: !t.private && (t.members || []).filter(m => m !== t.owner).length === 0 && s0.memberPicker !== t.id,
        onOpenMembers: () => this.setState({ memberPicker: t.id }),
        memberToggles: s.people.map(u => { const on = (t.members || []).indexOf(u.id) >= 0;
          return { initials: u.initials, name: u.name, bg: on ? u.color : '#E9E6E0',
            color: on ? '#fff' : '#9C948B', onClick: () => this.toggleMember(t.id, u.id) }; }),
        ...this.lbVals(id => this.inArea(t, id), id => this.toggleLabelOn(t.id, id)),
        projectName: this.P(t.project).name,
        labelToggles: s0.projects.map(l => { const on = this.inArea(t, l.id), prim = t.project === l.id;
          return { name: l.name, dot: l.color, bg: on ? l.color + '22' : '#fff',
            border: on ? l.color : '#DFDBD3', weight: prim ? 700 : (on ? 600 : 400),
            onClick: () => this.toggleLabelOn(t.id, l.id) }; }),
        startShow: !!t.start || s0.dateEdit === t.id + ':start',
        startEmpty: !t.start && s0.dateEdit !== t.id + ':start',
        onStartOpen: () => this.setState({ dateEdit: t.id + ':start' }),
        dueShow: !!t.due || s0.dateEdit === t.id + ':due',
        dueEmpty: !t.due && s0.dateEdit !== t.id + ':due',
        onDueOpen: () => this.setState({ dateEdit: t.id + ':due' }),
        startValue: t.start || '', onStartChange: (e) => this.patch(t.id, { start: e.target.value || null }),
        dueValue: t.due || '', onDueChange: (e) => this.patch(t.id, { due: e.target.value || null }),
        estValue: t.est || '', onEstChange: (e) => this.patch(t.id, { est: parseFloat(String(e.target.value).replace(',', '.')) || 0 }),
        timeLine: num(sp) + ' / ' + num(t.est) + ' t',
        spentWeight: t.est && sp > t.est ? 700 : 600,
        spentColor: t.est && sp > t.est ? '#9C160D' : '#231F20',
        runClock: s0.timerTask === t.id ? (() => { const s2 = Math.floor((Date.now() - s0.timerStart) / 1000); return d2(Math.floor(s2 / 3600)) + ':' + d2(Math.floor(s2 % 3600 / 60)) + ':' + d2(s2 % 60); })() : '',
        timeMain: s0.timerTask === t.id ? (() => { const s2 = Math.floor((Date.now() - s0.timerStart) / 1000); return d2(Math.floor(s2 / 3600)) + ':' + d2(Math.floor(s2 % 3600 / 60)) + ':' + d2(s2 % 60); })() : (sp > 0 ? hrs(sp) : '0 t'),
        timeMainColor: s0.timerTask === t.id ? '#0031EB' : (t.est && sp > t.est ? '#9C160D' : '#231F20'),
        datesOpen: !!t.start || !!t.due || String(s0.dateEdit || '').indexOf(t.id + ':') === 0,
        datesClosed: !t.start && !t.due && String(s0.dateEdit || '').indexOf(t.id + ':') !== 0,
        onDatesOpen: () => this.setState({ dateEdit: t.id + ':due' }),
        logOpen: (s0.logForm || {}).task === t.id,
        onLogOpen: () => this.setState({ logForm: (s0.logForm || {}).task === t.id ? null : { task: t.id, hours: '', date: TODAY } }),
        logHours: (s0.logForm || {}).hours || '',
        onLogHours: (e) => this.setState({ logForm: Object.assign({}, s0.logForm, { hours: e.target.value }) }),
        logDate: (s0.logForm || {}).date || TODAY,
        onLogDate: (e) => this.setState({ logForm: Object.assign({}, s0.logForm, { date: e.target.value }) }),
        onLogSave: () => this.logTime(t.id),
        onLogKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); this.logTime(t.id); } },
        logLinkLabel: (s0.logForm || {}).task === t.id ? 'Luk' : '+ Registrér tid manuelt',
        logQuick: [['15 min', 0.25], ['30 min', 0.5], ['1 t', 1], ['2 t', 2]].map(q => ({ label: q[0], onClick: () => this.setState({ logForm: Object.assign({}, s0.logForm, { hours: String(q[1]).replace('.', ',') }) }) })),
        entries: s0.entries.map((e, i) => ({ e, i })).filter(x => x.e[0] === t.id)
          .sort((a, b) => (a.e[2] < b.e[2] ? 1 : -1)).slice(0, 12)
          .map(x => ({ who: this.U(x.e[1]).name, date: fmt(x.e[2]), hours: hrs(x.e[3]), kind: x.e[4] === 'timer' ? 'Timer' : 'Manuelt',
            mine: x.e[1] === s0.me, onDelete: () => this.delEntry(x.i) })),
        newItemKey: (e) => { if (e.key === 'Enter') { this.addItemTo(t.id, e.target.value); e.target.value = ''; } },
        owner2: t.owner,
        comments: (t.comments || []).map(c => ({
          initials: this.U(c.by).initials, color: this.U(c.by).color, name: this.U(c.by).name,
          text: c.text, when: WH(c),
          replies: c.replies.map(r => ({ initials: this.U(r.by).initials, color: this.U(r.by).color,
            name: this.U(r.by).name, text: r.text, when: WH(r) })),
          replyOpen: s0.replyTo === c.id,
          onReplyOpen: () => this.setState({ replyTo: s0.replyTo === c.id ? null : c.id, reply: '' }),
          replyValue: s0.reply || '',
          onReplyChange: (e) => this.setState({ reply: e.target.value }),
          onReplyKey: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.addReply(t.id, c.id, s0.reply || ''); } },
          onReplySend: () => this.addReply(t.id, c.id, s0.reply || '')
        })),
        commentCount: (t.comments || []).length ? (t.comments || []).length + ' tråde' : 'Ingen kommentarer',
        cmtValue: s0.cmt || '',
        onCmtChange: (e) => this.setState({ cmt: e.target.value }),
        onCmtKey: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.addComment(t.id, s0.cmt || ''); } },
        onCmtSend: () => this.addComment(t.id, s0.cmt || ''),
        mentionChips: s.people.filter(u => u.id !== s.me).map(u => ({ name: '@' + u.name,
          onClick: () => this.setState({ cmt: ((s0.cmt || '') + ' @' + u.name).trim() + ' ' }) })),
        onComplete: () => this.setStatus(t.id, t.status === 'faerdig' ? 'gang' : 'faerdig'),
        savedOpacity: s0.savedAt && Date.now() - s0.savedAt < 2500 ? 1 : 0,
        onArchive: () => this.toggleArchive(t.id),
        canPrivate: t.owner === s0.me,
        typeOpts: [['opgave', 'Opgave', 'Står i to do-lister, kalender og board'], ['lobende', 'Løbende arbejde', 'Står kun under Løbende arbejde på Min dag, men tid kan registreres']].map(o => { const on = (o[0] === 'lobende') === !!t.ongoing;
          return { label: o[1], tip: o[2], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3', onClick: () => ((v) => { if (!!v !== !!t.ongoing) this.setOngoing(t.id, v); })(o[0] === 'lobende') }; }),
        onOngoing: () => this.setOngoing(t.id, !t.ongoing),
        ongoingBorder: t.ongoing ? '#231F20' : '#C9C4BA', ongoingFill: t.ongoing ? '#231F20' : 'transparent', ongoingMark: t.ongoing ? '✓' : '',
        visOpts: [['team', 'Team'], ['privat', 'Privat']].map(o => { const on = (o[0] === 'privat') === !!t.private;
          return { label: o[1], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3', onClick: () => this.setPrivate(t.id, o[0] === 'privat') }; }),
        archiveLabel: this.archived(t) ? 'Hent fra arkiv' : 'Arkivér opgave',
        archiveBorder: this.archived(t) ? '#CFDCF7' : '#DFDBD3', archiveBg: this.archived(t) ? '#F0F4FE' : '#fff', archiveColor: this.archived(t) ? '#0031EB' : '#6E675F'
      });
    } else v.d = null;

    // Ny/rediger opgave-modal
    v.onFileInput = (e) => this.onFileInput(e);
    v.fileRef = this.fileRef;
    v.onNew = () => this.openNew();
    v.onBatch = () => this.bset({ open: true });

    const B = s.batch;
    if (B.open) {
      const pill = (on) => ({ bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3' });
      const P = this.batchParse();
      const fieldOpts = [['skip','Spring over'],['title','Opgave'],['project','Område'],['owner','Ejer'],['due','Deadline'],['est','Estimat'],['prio','Prioritet']];
      const ok = P.rows.filter(r => r.title).length;
      const flagged = P.rows.filter(r => r.issues.length).length;
      v.b = {
        isPaste: B.tab === 'paste', isTpl: B.tab === 'skabelon',
        tabs: [['paste','Indsæt fra regneark'],['skabelon','Skabeloner']].map(t =>
          Object.assign({ label: t[1], onClick: () => this.bset({ tab: t[0] }) }, pill(B.tab === t[0]))),
        raw: B.raw, onRaw: (e) => this.bset({ raw: e.target.value, map: null }),
        hasHeader: B.hasHeader, onHeader: () => this.bset({ hasHeader: !B.hasHeader, map: null }),
        headerLabel: B.hasHeader ? '✓' : '',
        headerBorder: B.hasHeader ? '#231F20' : '#C9C4BA', headerFill: B.hasHeader ? '#231F20' : 'transparent',
        hasRows: P.rows.length > 0,
        cols: P.head.map((h, i) => ({ head: h, value: P.map[i],
          onChange: (e) => { const m = P.map.slice(); m[i] = e.target.value; this.bset({ map: m }); },
          opts: fieldOpts.map(o => ({ id: o[0], name: o[1] })) })),
        rows: P.rows.map(r => ({ title: r.title || '—',
          titleColor: r.title ? '#231F20' : '#9C160D',
          project: this.P(r.project).name, projectColor: this.P(r.project).color,
          owner: this.U(r.owner).name, ownerColor: this.U(r.owner).color, ownerInitials: this.U(r.owner).initials,
          due: r.due ? fmt(r.due) : '–', dueColor: r.due ? '#4A443F' : '#C9C4BA',
          est: r.est ? num(r.est) + ' t' : '–', estColor: r.est ? '#4A443F' : '#C9C4BA',
          prio: PRIO[r.prio].label, prioColor: PRIO[r.prio].color,
          issue: r.issues.length ? r.issues.join(' · ') : null })),
        summary: P.rows.length ? ok + ' opgaver klar' + (flagged ? ' · ' + flagged + ' med bemærkninger' : '') : 'Ingen linjer endnu',
        createLabel: B.tab === 'paste' ? 'Opret ' + ok + ' opgaver' : 'Opret ' + B.picks.length + (B.picks.length === 1 ? ' opgave' : ' opgaver'),
        templates: s.templates.map(t => { const on = B.picks.indexOf(t.id) >= 0;
          return { name: t.name, project: this.P(t.project).name, color: this.P(t.project).color,
            meta: t.checklist.length + ' punkter · ' + num(t.est) + ' t estimeret',
            mark: on ? '✓' : '', boxBorder: on ? '#231F20' : '#C9C4BA', boxFill: on ? '#231F20' : 'transparent',
            bg: on ? '#F7F5F1' : '#fff', border: on ? '#C9C4BA' : '#DFDBD3',
            onToggle: () => this.bset({ picks: on ? B.picks.filter(x => x !== t.id) : B.picks.concat([t.id]) }),
            onRename: (e) => this.setState({ templates: this.state.templates.map(x => x.id === t.id ? Object.assign({}, x, { name: e.target.value }) : x) }),
            onDelete: (e) => { if (e) e.stopPropagation(); this.snap('sletning af skabelon');
              this.setState({ templates: this.state.templates.filter(x => x.id !== t.id) }); this.bset({ picks: B.picks.filter(x => x !== t.id) }); } }; }),
        shOwner: B.shared.owner, onShOwner: (e) => this.sset({ owner: e.target.value }),
        ownerOpts: [{ id: '', name: 'Fra kolonnen / uændret' }].concat(s.people.map(u => ({ id: u.id, name: u.name }))),
        shDue: B.shared.due, onShDue: (e) => this.sset({ due: e.target.value }),
        shPrio: B.shared.prio, onShPrio: (e) => this.sset({ prio: e.target.value }),
        prioOpts: [{ id: '', name: 'Fra kolonnen / uændret' }].concat(['hoej','normal','lav'].map(k => ({ id: k, name: PRIO[k].label }))),
        memberOpts: s.people.map(u => { const on = B.shared.members.indexOf(u.id) >= 0;
          return { initials: u.initials, name: u.name, avatarBg: on ? u.color : '#E4E0D8', avatarColor: on ? '#fff' : '#9C948B',
            border: on ? u.color : '#DFDBD3', bg: on ? u.color + '14' : '#fff', color: on ? '#231F20' : '#6E675F',
            onClick: () => this.sset({ members: on ? B.shared.members.filter(x => x !== u.id) : B.shared.members.concat([u.id]) }) }; }),
        onCancel: () => this.setState({ batch: this.blankBatch() }),
        onCreate: () => B.tab === 'paste' ? this.createBatch() : this.createFromTemplates()
      };
    } else v.b = null;
    const dr = s.draft;
    if (dr) {
      const R = dr.recur, isRec = R.mode !== 'none';
      const unit = { day: R.every > 1 ? 'dage' : 'dag', week: R.every > 1 ? 'uger' : 'uge', month: R.every > 1 ? 'måneder' : 'måned', year: R.every > 1 ? 'år' : 'år' }[R.mode] || '';
      const pill = (on) => ({ bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3' });
      v.m = {
        heading: dr.editId ? 'Rediger opgave' : 'Ny opgave',
        sub: dr.editId ? 'Ændringer gemmes på opgaven' : 'Udfyld det du ved nu — resten kan tilføjes senere',
        saveLabel: dr.editId ? 'Gem ændringer' : 'Opret opgave',
        title: dr.title, onTitle: (e) => this.dset({ title: e.target.value }),
        desc: dr.desc, onDesc: (e) => this.dset({ desc: e.target.value }),
        project: dr.project, onProject: (e) => this.dset({ project: e.target.value }),
        projectOpts: s.projects.map(p => ({ id: p.id, name: p.name })),
        owner: dr.owner, onOwner: (e) => this.dset({ owner: e.target.value }),
        peopleOpts: s.people.map(u => ({ id: u.id, name: u.name })),
        memberOpts: s.people.map(u => { const on = dr.members.indexOf(u.id) >= 0;
          return { initials: u.initials, name: u.name, avatarBg: on ? u.color : '#E4E0D8', avatarColor: on ? '#fff' : '#9C948B',
            border: on ? u.color : '#DFDBD3', bg: on ? u.color + '14' : '#fff', color: on ? '#231F20' : '#6E675F',
            onClick: () => {
              const d = this.state.draft;
              if (u.id === d.owner && d.members.indexOf(u.id) >= 0) {
                const rest = d.members.filter(x => x !== u.id);
                if (!rest.length) { this.flash('Tilføj først den, der skal udføre opgaven, som medlem.'); return; }
                this.dset({ members: rest, owner: rest[0], newItem: Object.assign({}, d.newItem, { by: d.newItem.by === u.id ? rest[0] : d.newItem.by }),
                  checklist: d.checklist.map(c => c.by === u.id ? Object.assign({}, c, { by: rest[0] }) : c) });
                return;
              }
              this.toggleIn('members', u.id); } }; }),
        labelOpts: s.projects.map(l => { const on = dr.project === l.id || dr.labels.indexOf(l.id) >= 0, prim = dr.project === l.id;
          return { name: l.name, dot: l.color, bg: on ? l.color + '22' : '#fff',
            border: on ? l.color : '#DFDBD3', color: on ? '#231F20' : '#6E675F', weight: prim ? 700 : (on ? 600 : 400),
            onClick: () => this.toggleDraftArea(l.id) }; }),
        ...this.lbVals(id => dr.project === id || dr.labels.indexOf(id) >= 0, id => this.toggleDraftArea(id)),
        prOpen: s.prUI.open,
        onPrToggle: () => this.pset({ open: !s.prUI.open, editId: null, creating: false }),
        prRows: s.projects.map(p => ({ name: p.name, color: p.color,
          count: s.tasks.filter(t => t.project === p.id).length + ' opgaver',
          bg: dr.project === p.id ? '#E9E6E0' : '#fff',
          onPick: () => this.dset({ project: p.id }),
          onEdit: (e) => { if (e) e.stopPropagation(); this.pset({ editId: p.id, creating: false, name: p.name, color: p.color }); } })),
        prEditing: !!(s.prUI.editId || s.prUI.creating),
        prEditHeading: s.prUI.editId ? 'Rediger område' : 'Nyt område',
        prName: s.prUI.name, onPrName: (e) => this.pset({ name: e.target.value }),
        prSwatches: SWATCH.map(c => ({ color: c, ring: s.prUI.color === c ? '#231F20' : 'transparent',
          onClick: () => this.pset({ color: c }) })),
        prHex: s.prUI.color,
        onPrHex: (e) => { let x = e.target.value.trim(); if (x && x[0] !== '#') x = '#' + x; this.pset({ color: x }); },
        onPrNew: () => this.pset({ creating: true, editId: null, name: '', color: SWATCH[0] }),
        onPrSave: () => this.saveProject(),
        onPrCancel: () => this.pset({ editId: null, creating: false, name: '' }),
        prCanDelete: !!s.prUI.editId,
        onPrDelete: () => this.delProject(s.prUI.editId),
        prioOpts: ['hoej','normal','lav'].map(k => Object.assign({ label: PRIO[k].label,
          onClick: () => this.dset({ prio: k }) }, pill(dr.prio === k))),
        statusOpts: ORDER.map(k => Object.assign({ label: STATUS[k].label,
          onClick: () => this.dset({ status: k }) }, pill(dr.status === k))),
        start: dr.start, onStart: (e) => this.dset({ start: e.target.value }),
        due: dr.due, onDue: (e) => this.dset({ due: e.target.value }),
        est: dr.est, onEst: (e) => this.dset({ est: e.target.value }),
        showPicker: (e) => { try { e.target.showPicker(); } catch (x) {} },
        ownerInitials: this.U(dr.owner).initials, ownerColor: this.U(dr.owner).color,
        niInitials: this.U(dr.newItem.by).initials, niColor: this.U(dr.newItem.by).color,
        niHasDue: !!dr.newItem.due, niNoDue: !dr.newItem.due,
        visOpts: [['team', 'Team'], ['privat', 'Privat']].map(o => { const on = (o[0] === 'privat') === !!dr.private;
          return { label: o[1], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3', onClick: () => ((v) => this.dset(v ? { private: true, members: [dr.owner] } : { private: false }))(o[0] === 'privat') }; }),
        typeOpts: [['opgave', 'Opgave', 'Står i to do-lister, kalender og board'], ['lobende', 'Løbende arbejde', 'Står kun under Løbende arbejde på Min dag, men tid kan registreres']].map(o => { const on = (o[0] === 'lobende') === !!dr.ongoing;
          return { label: o[1], tip: o[2], bg: on ? '#231F20' : '#fff', color: on ? '#fff' : '#4A443F', border: on ? '#231F20' : '#DFDBD3', onClick: () => ((v) => this.dset({ ongoing: v }))(o[0] === 'lobende') }; }),
        onOngoing: () => this.dset({ ongoing: !dr.ongoing }),
        ongoingBorder: dr.ongoing ? '#231F20' : '#C9C4BA', ongoingFill: dr.ongoing ? '#231F20' : 'transparent', ongoingMark: dr.ongoing ? '✓' : '',
        hasItems: dr.checklist.length > 0, itemCount: dr.checklist.length, clearAsk: !!s0.draftClearAsk,
        onClearAsk: () => this.setState({ draftClearAsk: true }), onClearNo: () => this.setState({ draftClearAsk: false }),
        onClearYes: () => { this.setState({ draftClearAsk: false }); this.dset({ checklist: [] }); },
        checklist: dr.checklist.map((c, i) => ({
          text: c.text, onText: (e) => this.updItem(i, { text: e.target.value }),
          by: c.by, onBy: (e) => this.updItem(i, { by: e.target.value }),
          due: c.due || '', onDue: (e) => this.updItem(i, { due: e.target.value || null }),
          after: c.after || '', onAfter: (e) => this.updItem(i, { after: e.target.value || null }),
          depOpts: [{ id: '', name: 'Ingen' }].concat(
            dr.checklist.filter((o, j) => j !== i).map(o => ({ id: o.id, name: o.text.slice(0, 42) }))),
          showDep: !!c.after || dr.depOpen === c.id,
          linkColor: c.after ? '#0031EB' : '#6E675F',
          onLink: () => this.dset({ depOpen: dr.depOpen === c.id ? null : c.id }),
          linkBorder: c.after ? '#0031EB' : '#DFDBD3', linkBg: c.after ? '#F0F4FE' : '#fff',
          ownerInitials: this.U(c.by).initials, ownerColor: this.U(c.by).color,
          hasDue: !!c.due, noDue: !c.due,
          dotColor: this.U(c.by).color, onDelete: () => this.delItem(i) })),
        checkCount: dr.checklist.length ? dr.checklist.length + ' punkter' : 'Ingen punkter',
        niText: dr.newItem.text, onNiText: (e) => this.dset({ newItem: Object.assign({}, dr.newItem, { text: e.target.value }) }),
        onNiKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addItem(); } },
        niBy: dr.newItem.by, onNiBy: (e) => this.dset({ newItem: Object.assign({}, dr.newItem, { by: e.target.value }) }),
        niDue: dr.newItem.due, onNiDue: (e) => this.dset({ newItem: Object.assign({}, dr.newItem, { due: e.target.value }) }),
        onAddItem: () => this.addItem(),
        files: dr.files.map((f, i) => ({ name: f.name, meta: f.size + ' · ' + WH(f), kind: f.kind, onDelete: () => this.delDraftFile(i) })),
        fileCount: dr.files.length ? dr.files.length + ' filer' : 'Ingen filer',
        onAttach: () => this.pickFiles('draft'),
        onDropFiles: (e) => this.onDrop('draft', e),
        onDragOver: (e) => e.preventDefault(),
        recurModes: [['none','Gentages ikke'],['day','Dagligt'],['week','Ugentligt'],['month','Månedligt'],['year','Årligt']]
          .map(o => Object.assign({ label: o[1], onClick: () => this.rset({ mode: o[0] }) }, pill(R.mode === o[0]))),
        isRec, every: R.every, onEvery: (e) => this.rset({ every: Math.max(1, parseInt(e.target.value, 10) || 1) }), unit,
        isWeek: R.mode === 'week',
        weekdays: [1,2,3,4,5,6,0].map(n => { const on = R.weekdays.indexOf(n) >= 0;
          return Object.assign({ label: WD[n], onClick: () => this.toggleWd(n) }, pill(on)); }),
        isMonth: R.mode === 'month',
        monthDayModes: [['dag','På dag i måneden'],['ugedag','På ugedag']].map(o =>
          Object.assign({ label: o[1], onClick: () => this.rset({ dayMode: o[0] }) }, pill(R.dayMode === o[0]))),
        byDay: R.dayMode === 'dag', byWeekday: R.dayMode === 'ugedag',
        monthDay: R.monthDay, onMonthDay: (e) => this.rset({ monthDay: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)) }),
        nth: R.nth, onNth: (e) => this.rset({ nth: e.target.value }),
        nthOpts: NTH.map(x => ({ id: x[0], name: x[1] })),
        nthDay: R.nthDay, onNthDay: (e) => this.rset({ nthDay: parseInt(e.target.value, 10) }),
        wdOpts: [1,2,3,4,5,6,0].map(n => ({ id: n, name: WDLONG[n] })),
        isYear: R.mode === 'year',
        month: R.month, onMonth: (e) => this.rset({ month: parseInt(e.target.value, 10) }),
        monthOpts: MONTH.map((m, i) => ({ id: i + 1, name: m })),
        endModes: [['never','Ingen slutdato'],['count','Slut efter'],['date','Slut den']].map(o =>
          Object.assign({ label: o[1], onClick: () => this.rset({ endMode: o[0] }) }, pill(R.endMode === o[0]))),
        endIsCount: R.endMode === 'count', endIsDate: R.endMode === 'date',
        endCount: R.endCount, onEndCount: (e) => this.rset({ endCount: Math.max(1, parseInt(e.target.value, 10) || 1) }),
        endDate: R.endDate, onEndDate: (e) => this.rset({ endDate: e.target.value }),
        recurSummary: this.recurText(R) || '',
        canDelete: !!dr.editId,
        confirmDel: !!dr.confirmDel,
        delCount: dr.editId ? s.tasks.filter(x => x.deps.indexOf(dr.editId) >= 0).length : 0,
        delNote: dr.editId && s.tasks.filter(x => x.deps.indexOf(dr.editId) >= 0).length
          ? 'Opgaven slettes, og afhængigheden fjernes fra de opgaver, der venter på den.'
          : 'Opgaven slettes helt. Det kan ikke fortrydes.',
        onAskDelete: () => this.dset({ confirmDel: true }),
        onCancelDelete: () => this.dset({ confirmDel: false }),
        onDelete: () => this.deleteTask(dr.editId),
        onCancel: () => this.setState({ draft: null }),
        isNew: !dr.editId,
        hasTpl: !dr.editId && s0.templates.length > 0,
        tplOpts: s0.templates.map(t => ({ id: t.id, name: t.name })),
        onTpl: (e) => this.applyTemplate(e.target.value),
        onBatch: () => { this.setState({ draft: null }); this.bset({ open: true }); },
        spentNow: dr.spentNow || '', onSpentNow: (e) => this.dset({ spentNow: e.target.value }),
        mailOpen: !!(dr.mail && dr.mail.open), mailText: (dr.mail && dr.mail.text) || '', mailErr: (dr.mail && dr.mail.err) || '', mailBusy: !!(dr.mail && dr.mail.busy),
        mailNote: (dr.mail && !dr.mail.open && dr.mail.note) || '', mailBtnBg: dr.mail && dr.mail.open ? '#F0F4FE' : '#fff', mailBtnBorder: dr.mail && dr.mail.open ? '#0031EB' : '#DFDBD3',
        onMailToggle: () => this.mset({ open: !(dr.mail && dr.mail.open), err: '' }),
        onMailText: (e) => this.mset({ text: e.target.value, err: '' }),
        onMailFill: () => this.mailFromText(),
        onMailClose: () => this.mset({ open: false }),
        onMailNoteClose: () => this.mset({ note: '' }),
        onMailPick: (e) => { const f = e.target.files && e.target.files[0]; this.mailFromFile(f); try { e.target.value = ''; } catch (x) {} },
        onMailDragOver: (e) => { e.preventDefault(); },
        onMailDrop: (e) => { e.preventDefault(); e.stopPropagation(); const dt = e.dataTransfer; const f = dt.files && dt.files[0];
          if (f) { this.mailFromFile(f); return; } const t = dt.getData('text/plain'); if (t) this.mset({ text: t, err: '' }); },
        onSave: () => this.saveDraft()
      };
    } else v.m = null;

    return v;
  }
}

window.FlowComponent = Component;
window.FlowHelpers = { nextRecurDate, relTime, isoOf, addDays };

})();
;
// Datalag: Firebase (Firestore + Microsoft-login) eller lokal demo (localStorage) når config.js ikke er udfyldt.
// Samme mønster som Pling: al data går gennem ét lag, så UI'et ikke kender backend.
(function () {
  const COLS = ['tasks', 'entries', 'notes', 'stickies', 'templates'];
  const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v)));

  // entries er tupler [taskId, personId, dato, timer, kilde?, id]
  const entryToDoc = (e) => ({ v: [e[0], e[1], e[2], e[3], e[4] || 'manuel'] });
  const entryFromDoc = (id, d) => { const v = (d.v || []).slice(0, 5); v[5] = id; return v; };
  const taskToDoc = (t) => { const o = Object.assign({}, t); delete o.spent; delete o.dirty; return clean(o); };

  function toDoc(col, x) {
    if (col === 'entries') return entryToDoc(x);
    if (col === 'tasks') return taskToDoc(x);
    return clean(x);
  }
  function fromDoc(col, id, d) {
    if (col === 'entries') return entryFromDoc(id, d);
    return Object.assign({}, d, { id });
  }
  const idOf = (col, x) => (col === 'entries' ? x[5] : x.id);

  // ---------- Firebase backend ----------
  async function firebaseBackend(cfg) {
    const V = '10.12.5';
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app = initializeApp(cfg.firebase);
    // App Check med reCAPTCHA v3: kun kald fra jeres egen side accepteres af login og database.
    if (cfg.recaptchaSiteKey && !cfg.emulator) {
      const AC = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app-check.js`);
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      AC.initializeAppCheck(app, { provider: new AC.ReCaptchaV3Provider(cfg.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
    }
    const auth = A.getAuth(app);
    const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    if (cfg.emulator) { A.connectAuthEmulator(auth, cfg.emulator.auth, { disableWarnings: true }); F.connectFirestoreEmulator(db, 'localhost', cfg.emulator.firestorePort); }
    let signupName = '';
    const toUser = (u) => u ? { uid: u.uid, email: (u.email || '').toLowerCase(), name: u.displayName || signupName || '' } : null;
    return {
      mode: 'firebase',
      onAuth: (cb) => A.onAuthStateChanged(auth, (u) => cb(toUser(u))),
      signIn: (email, pw) => A.signInWithEmailAndPassword(auth, email.trim(), pw),
      async signUp(name, email, pw) {
        signupName = name.trim();
        const c = await A.createUserWithEmailAndPassword(auth, email.trim(), pw);
        try { await A.updateProfile(c.user, { displayName: name.trim() }); } catch (e) {}
        await F.setDoc(F.doc(db, 'access', c.user.uid), { name: name.trim(), email: email.trim().toLowerCase(), status: 'pending', ts: new Date().toISOString() });
      },
      resetPassword: (email) => A.sendPasswordResetEmail(auth, email.trim()),
      signOut: () => A.signOut(auth),
      requestAccess: (u, name) => F.setDoc(F.doc(db, 'access', u.uid), { name: name || u.name || u.email, email: u.email, status: 'pending', ts: new Date().toISOString() }),
      watchAccess: (uid, cb) => F.onSnapshot(F.doc(db, 'access', uid), (d) => cb(d.exists() ? d.data() : null), () => cb(null)),
      watchRequests: (cb) => F.onSnapshot(F.collection(db, 'access'), (qs) => cb(qs.docs.map((d) => Object.assign({ uid: d.id }, d.data())))),
      setAccess: (uid, patch) => F.setDoc(F.doc(db, 'access', uid), clean(patch), { merge: true }),
      // Invitationer: admin laver et personligt link med en hemmelig nøgle; linket sendes via Teams
      async createInvite(person, byId) {
        const email = (person.email || '').trim().toLowerCase();
        const b = new Uint8Array(24); crypto.getRandomValues(b);
        const token = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        await F.setDoc(F.doc(db, 'invites', email), { email, person: person.id, name: person.name, token, by: byId, ts: new Date().toISOString() });
        const q = new URLSearchParams({ invite: token, e: email, p: person.id, n: person.name || '' });
        return location.origin + location.pathname + '?' + q.toString();
      },
      // Hemmeligheder (fx Teams-URL) ligger i databasen, ikke i de offentlige filer
      async getPrivate(id) { try { const d = await F.getDoc(F.doc(db, 'private', id)); return d.exists() ? d.data() : null; } catch (e) { return null; } },
      setPrivate: (id, data) => F.setDoc(F.doc(db, 'private', id), clean(data)),
      watchInvites: (cb) => F.onSnapshot(F.collection(db, 'invites'), (qs) => cb(qs.docs.map((d) => d.data())), () => cb([])),
      isInviteLink: () => !!new URLSearchParams(location.search).get('invite'),
      inviteEmail: () => new URLSearchParams(location.search).get('e') || '',
      invitePromise: null,
      completeInvite(email, pw) {
        const self = this, q = new URLSearchParams(location.search);
        const token = q.get('invite') || '', person = q.get('p') || '', name = q.get('n') || '';
        const run = (async () => {
          const em = email.trim().toLowerCase();
          let cred;
          try { cred = await A.createUserWithEmailAndPassword(auth, em, pw); }
          catch (e) { if (e && e.code === 'auth/email-already-in-use') cred = await A.signInWithEmailAndPassword(auth, em, pw); else throw e; }
          try { if (name) await A.updateProfile(cred.user, { displayName: name }); } catch (e) {}
          try {
            await F.setDoc(F.doc(db, 'access', cred.user.uid), { name: name || em, email: em, status: 'approved', person, token, via: 'invite', ts: new Date().toISOString() });
          } catch (e) { throw new Error('Linket passer ikke til din e-mail, eller det er erstattet af en nyere invitation. Bed om et nyt.'); }
          try { history.replaceState(null, '', location.pathname); } catch (e) {}
        })();
        self.invitePromise = run.finally(() => { self.invitePromise = null; });
        return run;
      },
      async load() {
        const cfgSnap = await F.getDoc(F.doc(db, 'config', 'main'));
        const out = { config: cfgSnap.exists() ? cfgSnap.data() : null };
        await Promise.all(COLS.map(async (c) => {
          const qs = await F.getDocs(F.collection(db, c));
          out[c] = qs.docs.map((d) => fromDoc(c, d.id, d.data()));
        }));
        return out;
      },
      async importSeed(data) {
        await F.setDoc(F.doc(db, 'config', 'main'), clean(data.config));
        for (const c of COLS) {
          const items = data[c] || [];
          for (let i = 0; i < items.length; i += 400) {
            const b = F.writeBatch(db);
            items.slice(i, i + 400).forEach((x) => b.set(F.doc(db, c, idOf(c, x)), toDoc(c, x)));
            await b.commit();
          }
        }
      },
      subscribe(onCol, onConfig) {
        const unsubs = COLS.map((c) => F.onSnapshot(F.collection(db, c), (qs) => {
          onCol(c, qs.docs.map((d) => fromDoc(c, d.id, d.data())));
        }));
        unsubs.push(F.onSnapshot(F.doc(db, 'config', 'main'), (d) => { if (d.exists()) onConfig(d.data()); }));
        return () => unsubs.forEach((u) => u());
      },
      async write(ops) { // ops: [{col, id, data|null}]
        for (let i = 0; i < ops.length; i += 400) {
          const b = F.writeBatch(db);
          ops.slice(i, i + 400).forEach((o) => {
            const ref = o.col === 'config' ? F.doc(db, 'config', 'main') : F.doc(db, o.col, o.id);
            if (o.data === null) b.delete(ref); else b.set(ref, o.data);
          });
          await b.commit();
        }
      },
      timerRef: (pid) => F.doc(db, 'timers', pid),
      async getTimer(pid) { const d = await F.getDoc(F.doc(db, 'timers', pid)); return d.exists() ? d.data() : null; },
      setTimer: (pid, t) => F.setDoc(F.doc(db, 'timers', pid), clean(t || { task: null, start: null })),
      watchTimer: (pid, cb) => F.onSnapshot(F.doc(db, 'timers', pid), (d) => cb(d.exists() ? d.data() : null))
    };
  }

  // ---------- Lokal demo backend ----------
  function localBackend() {
    const K = 'flow_demo_v1';
    const read = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } };
    const save = (d) => { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {} };
    let authCb = null;
    const who = () => { try { return localStorage.getItem(K + '_who'); } catch (e) { return null; } };
    return {
      mode: 'local',
      onAuth: (cb) => { authCb = cb; const w = new URLSearchParams(location.search).get('as') || who(); cb(w ? { uid: w, email: w, name: '' } : null); return () => {}; },
      signIn: async (id) => { try { localStorage.setItem(K + '_who', id); } catch (e) {} if (authCb) authCb({ uid: id, email: id, name: '' }); },
      signOut: async () => { try { localStorage.removeItem(K + '_who'); } catch (e) {} if (authCb) authCb(null); },
      watchAccess: (uid, cb) => { cb({ status: 'approved' }); return () => {}; },
      watchRequests: () => () => {},
      setAccess: async () => {},
      async load() {
        const d = read() || {};
        const out = { config: d.config || null };
        COLS.forEach((c) => { out[c] = Object.entries(d[c] || {}).map(([id, x]) => fromDoc(c, id, x)); });
        return out;
      },
      async importSeed(data) {
        const d = { config: clean(data.config) };
        COLS.forEach((c) => { d[c] = {}; (data[c] || []).forEach((x) => { d[c][idOf(c, x)] = toDoc(c, x); }); });
        save(d);
      },
      subscribe: () => () => {},
      async write(ops) {
        const d = read() || { config: null };
        ops.forEach((o) => {
          if (o.col === 'config') { d.config = o.data; return; }
          d[o.col] = d[o.col] || {};
          if (o.data === null) delete d[o.col][o.id]; else d[o.col][o.id] = o.data;
        });
        save(d);
      },
      async getTimer(pid) { const d = read() || {}; return (d.timers || {})[pid] || null; },
      async setTimer(pid, t) { const d = read() || {}; d.timers = d.timers || {}; d.timers[pid] = t; save(d); },
      watchTimer: () => () => {}
    };
  }

  window.FlowStore = {
    COLS, toDoc, idOf,
    async create(cfg) {
      const ok = cfg && cfg.firebase && cfg.firebase.apiKey && !/UDFYLD/.test(cfg.firebase.apiKey);
      return ok ? firebaseBackend(cfg) : localBackend();
    }
  };
})();

;
// Opstart, login og synkronisering mellem UI-state og databasen.
(function () {
  const React = window.React, h = React.createElement;
  const CFG = window.FLOW_CONFIG || {};
  const COLS = window.FlowStore.COLS;
  const rootEl = document.getElementById('root');
  const root = window.ReactDOM.createRoot(rootEl);

  // Stabil JSON (sorterede nøgler), så lokale og hentede dokumenter kan sammenlignes.
  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  const docJson = (col, x) => stable(window.FlowStore.toDoc(col, x));
  const idOf = window.FlowStore.idOf;
  let uid = 0;
  const newId = (p) => p + Date.now().toString(36) + (uid++).toString(36) + Math.random().toString(36).slice(2, 6);

  function withSpent(tasks, entries) {
    const sum = {};
    entries.forEach((e) => { sum[e[0]] = (sum[e[0]] || 0) + (+e[3] || 0); });
    return tasks.map((t) => { const sp = Math.round((sum[t.id] || 0) * 100) / 100; return t.spent === sp ? t : Object.assign({}, t, { spent: sp }); });
  }

  // ---------- Startindhold ----------
  function buildSeed() {
    const base = window.FlowSeedBase();
    const team = CFG.team || {};
    const people = base.people.map((p) => Object.assign({}, p, { email: (team[p.name] || '').toLowerCase() }));
    const now = new Date().toISOString();
    const full = window.FlowTrelloFull || {};
    const tasks = window.FlowComponent.prototype.seed.call(null).map((t) => {
      const o = Object.assign({}, t, { spent: 0, dirty: false, created: now, log: [], comments: t.comments || [],
        imported: t.id[0] === 'k' ? 'Trello' : 'Ecommerce flow.xlsx' });
      const f = full[t.id];
      if (f) {
        if (f.desc) o.desc = f.desc;
        o.checklist = (o.checklist || []).map((c) => {
          const hit = f.items.find((x) => c.text && x.indexOf(c.text) === 0);
          return hit ? Object.assign({}, c, { text: hit }) : c;
        });
        if (f.url) o.files = (o.files || []).concat([{ name: 'trello.com', url: f.url, kind: 'LINK', by: t.owner, when: '', ts: now, size: '' }]);
      }
      return o;
    });
    return {
      config: { people, projects: base.projects, labelDefs: base.labelDefs },
      tasks, templates: base.templates, entries: [], notes: [], stickies: []
    };
  }

  // ---------- Teams ----------
  // Personlig Teams-besked: sendes til en Power Automate-workflow, der skriver til modtageren i en 1:1-chat.
  function postTeams(note, state, linkOverride) {
    const url = CFG.teamsWebhookUrl;  // sat ved login fra databasen (private/teams)
    if (!url || !note.channel) return;
    const to = state.people.find((p) => p.id === note.to);
    if (!to || !to.email) return;
    const task = state.tasks.find((t) => t.id === note.task);
    const link = linkOverride || (location.origin + location.pathname + '#task=' + encodeURIComponent(note.task || ''));
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
      body: [
        { type: 'TextBlock', text: note.tag, size: 'Small', weight: 'Bolder', color: 'Accent', spacing: 'None' },
        { type: 'TextBlock', text: note.title, weight: 'Bolder', wrap: true },
        { type: 'TextBlock', text: note.body, wrap: true, spacing: 'Small' },
        task ? { type: 'TextBlock', text: 'Opgave: ' + task.title, isSubtle: true, size: 'Small', wrap: true } : null
      ].filter(Boolean),
      actions: [{ type: 'Action.OpenUrl', title: linkOverride ? 'Opret mit login' : 'Åbn i Flow', url: link }]
    };
    const payload = { to: to.email, title: note.title, text: note.body, link, card: JSON.stringify(card),
      type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] };
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .catch(() => fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(() => {}));
  }

  // ---------- Skærme uden for appen ----------
  const shell = (children) => h('div', { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#231F20', fontFamily: "'Instrument Sans',system-ui,sans-serif", color: '#FAF9F6', padding: 20 } },
    h('div', { style: { width: 340, maxWidth: '100%' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 } },
        h('div', { style: { width: 28, height: 28, background: '#0031EB', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Archivo,sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' } }, 'F'),
        h('div', { style: { fontFamily: 'Archivo,sans-serif', fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em' } }, 'Flow')),
      children));
  const btn = (label, onClick, primary) => h('div', { onClick, className: 'flow-btn', style: { cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 4, background: primary ? '#FAF9F6' : 'transparent', color: primary ? '#231F20' : '#B5AEA6', border: primary ? 'none' : '1px solid #3A3533', marginTop: 8 } }, label);
  const msg = (t) => h('div', { style: { fontSize: 12.5, color: '#B5AEA6', lineHeight: 1.5, marginBottom: 14 } }, t);

  function showLoading(t) { root.render(shell(msg(t || 'Henter opgaver…'))); }
  function showError(e) { root.render(shell([msg('Noget gik galt: ' + (e && e.message ? e.message : String(e))), btn('Prøv igen', () => location.reload(), true)])); }

  const isAdmin = (email) => (CFG.admins || []).map((x) => x.toLowerCase()).indexOf((email || '').toLowerCase()) >= 0;
  const inputSt = { width: '100%', border: '1px solid #3A3533', background: '#2B2627', color: '#FAF9F6', borderRadius: 4, padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8 };
  const ERR = { 'auth/invalid-credential': 'Forkert e-mail eller adgangskode.', 'auth/wrong-password': 'Forkert e-mail eller adgangskode.', 'auth/user-not-found': 'Forkert e-mail eller adgangskode.',
    'auth/email-already-in-use': 'Der findes allerede en konto med den e-mail. Log ind i stedet.', 'auth/weak-password': 'Adgangskoden skal være mindst 6 tegn.',
    'auth/invalid-email': 'E-mailadressen ser ikke rigtig ud.', 'auth/too-many-requests': 'For mange forsøg. Vent lidt og prøv igen.', 'auth/network-request-failed': 'Ingen forbindelse. Tjek netværket.' };
  const errText = (e) => ERR[e && e.code] || (e && e.message) || String(e);

  function LoginForm({ store }) {
    const invite = store.isInviteLink && store.isInviteLink();
    const [mode, setMode] = React.useState(invite ? 'invite' : 'login');
    const [f, setF] = React.useState({ name: '', email: invite ? store.inviteEmail() : '', pw: '', web: '' });
    const t0 = React.useRef(Date.now());
    const [err, setErr] = React.useState(null), [info, setInfo] = React.useState(null), [busy, setBusy] = React.useState(false);
    const upd = (k) => (e) => setF(Object.assign({}, f, { [k]: e.target.value }));
    const run = async () => {
      setErr(null); setInfo(null);
      if (mode !== 'reset' && (!f.email || !f.pw)) { setErr('Udfyld e-mail og adgangskode.'); return; }
      if (mode === 'signup' && !f.name.trim()) { setErr('Skriv dit navn.'); return; }
      if (mode === 'invite') {
        if (f.pw.length < 6) { setErr('Adgangskoden skal være mindst 6 tegn.'); return; }
        setBusy(true);
        try { await store.completeInvite(f.email, f.pw); } catch (e) { setErr(e && e.code === 'auth/wrong-password' || (e && e.code === 'auth/invalid-credential') ? 'Du har allerede en konto. Brug din nuværende adgangskode.' : errText(e)); setBusy(false); }
        return;
      }
      // Fælde til bots: skjult felt udfyldt eller formular sendt urealistisk hurtigt
      if (mode === 'signup' && (f.web || Date.now() - t0.current < 2500)) { setInfo('Tak. Din konto venter på godkendelse.'); return; }
      setBusy(true);
      try {
        if (mode === 'login') await store.signIn(f.email, f.pw);
        else if (mode === 'signup') await store.signUp(f.name, f.email, f.pw);
        else { await store.resetPassword(f.email); setInfo('Tjek din indbakke for et link til ny adgangskode.'); }
      } catch (e) { setErr(errText(e)); }
      setBusy(false);
    };
    const onKey = (e) => { if (e.key === 'Enter') run(); };
    const link = (label, m) => h('span', { onClick: () => { setMode(m); setErr(null); setInfo(null); }, style: { cursor: 'pointer', color: '#B5AEA6', textDecoration: 'underline' } }, label);
    const hello = mode === 'invite' ? msg('Du er inviteret til Flow. Vælg en adgangskode, så er du inde.') : null;
    return h('form', { key: mode, method: 'post', action: '#', autoComplete: 'on', onSubmit: (e) => { e.preventDefault(); run(); } },
      hello,
      mode === 'signup' ? h('input', { style: inputSt, placeholder: 'Navn', name: 'name', autoComplete: 'name', value: f.name, onChange: upd('name'), autoFocus: true }) : null,
      mode === 'signup' ? h('input', { name: 'website', tabIndex: -1, autoComplete: 'off', 'aria-hidden': 'true', value: f.web, onChange: upd('web'), style: { position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 } }) : null,
      h('input', { style: inputSt, placeholder: 'E-mail', type: 'email', name: 'email', id: 'email', autoComplete: 'username', value: f.email, onChange: upd('email'), autoFocus: mode !== 'signup' }),
      mode !== 'reset' ? h('input', { style: inputSt, type: 'password', name: 'password', id: mode === 'signup' || mode === 'invite' ? 'new-password' : 'current-password',
        autoComplete: mode === 'signup' || mode === 'invite' ? 'new-password' : 'current-password', placeholder: mode === 'invite' ? 'Vælg en adgangskode' : 'Adgangskode', minLength: 6, value: f.pw, onChange: upd('pw') }) : null,
      err ? h('div', { style: { fontSize: 12, color: '#F4C7AC', margin: '2px 0 6px' } }, err) : null,
      info ? h('div', { style: { fontSize: 12, color: '#9FC4DB', margin: '2px 0 6px' } }, info) : null,
      h('button', { type: 'submit', className: 'flow-btn', disabled: busy, style: { width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 4, background: '#FAF9F6', color: '#231F20', border: 'none', marginTop: 8 } },
        busy ? '…' : mode === 'login' ? 'Log ind' : mode === 'signup' || mode === 'invite' ? 'Opret konto' : 'Send link'),
      h('div', { style: { fontSize: 12, color: '#6E675F', marginTop: 14, display: 'flex', justifyContent: 'space-between' } },
        mode === 'login' ? [h('span', { key: 1 }, link('Opret konto', 'signup')), h('span', { key: 2 }, link('Glemt adgangskode', 'reset'))]
          : h('span', null, link('Tilbage til log ind', 'login'))));
  }

  function showLogin(store) {
    if (store.mode === 'firebase') { root.render(shell(h(LoginForm, { store }))); return; }
    const people = window.FlowSeedBase ? window.FlowSeedBase().people : [];
    root.render(shell([msg('Demo-tilstand: data gemmes kun i denne browser. Udfyld config.js for at bruge den fælles database.'),
      ...people.map((p) => btn('Fortsæt som ' + p.name, () => store.signIn(p.id), true))]));
  }
  function showNoAccess(store, text) {
    root.render(shell([msg(text), btn('Log ud', () => store.signOut())]));
  }
  function showPending(store, user) {
    root.render(shell([msg('Hej ' + (user.name || user.email) + '. Din konto venter på godkendelse. Siden åbner af sig selv, når du er godkendt.'),
      btn('Log ud', () => store.signOut())]));
  }

  // ---------- Opstart ----------
  let unsub = null, mounted = false;

  async function start(store, user, acc, tries) {
    showLoading();
    const admin = store.mode === 'local' || isAdmin(user.email);
    let data = await store.load();
    if (!data.config && !admin) { showNoAccess(store, 'Flow er ikke sat op endnu. Administratoren skal logge ind først.'); return; }
    if (!data.config && !window.FlowSeedBase) { showNoAccess(store, 'Databasen er tom. Byg appen med import (node tools/build.mjs --med-import) for første opstart.'); return; }
    if (!data.config) {
      showLoading('Første opstart — importerer opgaver fra Trello og Ecommerce flow…');
      await store.importSeed(buildSeed());
      data = await store.load();
    }
    let people = data.config.people || [];
    let me = store.mode === 'local'
      ? people.find((p) => p.id === user.uid)
      : (people.find((p) => p.uid === user.uid) || (acc && acc.person ? people.find((p) => p.id === acc.person) : null)
        || (admin ? people.find((p) => p.email && p.email.toLowerCase() === user.email && !p.uid) : null));
    if (!me && !admin && (tries || 0) < 6) { await new Promise((r) => setTimeout(r, 1000)); return start(store, user, acc, (tries || 0) + 1); }
    // Reparér initialer, der blev nulstillet ved redigering (fejl rettet 25/9)
    const FIX = { u1: ['Louise', ['LO'], 'LK'], u2: ['Ditte', ['DI', 'DTV'], 'DT'] };
    if (admin && store.mode === 'firebase' && people.some((p) => FIX[p.id] && p.name === FIX[p.id][0] && FIX[p.id][1].indexOf(p.initials) >= 0)) {
      people = people.map((p) => FIX[p.id] && p.name === FIX[p.id][0] && FIX[p.id][1].indexOf(p.initials) >= 0 ? Object.assign({}, p, { initials: FIX[p.id][2] }) : p);
      data.config.people = people;
      await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
    }
    // Engangs-kobling af e-mails til de importerede personer (på person-ID, ikke navn)
    const boot = CFG.bootstrapEmails || {};
    if (admin && store.mode === 'firebase' && people.some((p) => boot[p.id] && !p.email)) {
      people = people.map((p) => boot[p.id] && !p.email ? Object.assign({}, p, { email: boot[p.id].toLowerCase() }) : p);
      data.config.people = people;
      await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
      if (!me) me = people.find((p) => !p.uid && p.email === user.email) || null;
      if (me && !me.uid) {
        me = Object.assign({}, me, { uid: user.uid });
        people = people.map((p) => p.id === me.id ? me : p);
        data.config.people = people;
        await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
      }
    }
    // Ryd op: findes der en tom dublet af mig og en person uden login med samme e-mail, så læg dem sammen
    if (me && store.mode === 'firebase') {
      const twin = people.find((p) => p.id !== me.id && !p.uid && p.email && p.email.toLowerCase() === user.email);
      const myTasks = (data.tasks || []).filter((t) => t.owner === me.id).length;
      if (twin && myTasks === 0) {
        const from = me.id, to = twin.id, rx = new RegExp('"' + from + '"', 'g');
        const ops = [];
        COLS.forEach((c) => {
          data[c] = (data[c] || []).map((x) => {
            const j = stable(window.FlowStore.toDoc(c, x));
            if (j.indexOf('"' + from + '"') < 0) return x;
            const nd = JSON.parse(j.replace(rx, '"' + to + '"'));
            ops.push({ col: c, id: idOf(c, x), data: nd });
            const back = c === 'entries' ? (() => { const v = nd.v.slice(0, 5); v[5] = x[5]; return v; })() : Object.assign({}, nd, { id: x.id, spent: x.spent });
            return back;
          });
        });
        me = Object.assign({}, twin, { uid: user.uid, email: user.email });
        people = people.filter((p) => p.id !== from).map((p) => p.id === to ? me : p);
        data.config.people = people;
        ops.push({ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) });
        await store.write(ops);
        try { const tm = await store.getTimer(from); if (tm && tm.task) await store.setTimer(to, tm); } catch (e) {}
      }
    }
    if (!me && admin && store.mode === 'firebase') {
      // Administratoren får automatisk sin egen person første gang
      const name = user.name || user.email.split('@')[0];
      const parts = name.trim().split(/\s+/);
      me = { id: 'u' + Date.now().toString(36), name: parts[0].charAt(0).toUpperCase() + parts[0].slice(1), uid: user.uid, email: user.email,
        initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase(), color: '#3FA9DE' };
      people = people.concat([me]);
      await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
      data.config.people = people;
    } else if (me && admin && !me.uid && store.mode === 'firebase') {
      people = people.map((p) => p.id === me.id ? Object.assign({}, p, { uid: user.uid }) : p);
      me = Object.assign({}, me, { uid: user.uid });
      await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
    }
    if (me && !me.uid && !admin && store.mode === 'firebase') {
      me = Object.assign({}, me, { uid: user.uid, email: me.email || user.email });
      people = people.map((p) => p.id === me.id ? me : p);
      data.config.people = people;
      await store.write([{ col: 'config', data: JSON.parse(stable({ people, projects: data.config.projects, labelDefs: data.config.labelDefs })) }]);
    }
    if (!me) { showNoAccess(store, 'Din konto er godkendt, men ikke koblet til en person i Flow endnu. Bed administratoren om at godkende dig igen.'); return; }

    // Engangs-omlægning: labels og områder slås sammen til "Område" (25/9)
    if (admin && store.mode === 'firebase' && store.getPrivate) {
      const mig = (await store.getPrivate('migrations')) || {};
      if (!mig.areasMerged) {
        const defs = data.config.labelDefs || [], projects = (data.config.projects || []).slice();
        const map = {}, prio = {}, park = {};
        const norm = (x) => (x || '').trim().toLowerCase();
        defs.forEach((l) => {
          const n = norm(l.name);
          if (n === 'haster') { prio[l.id] = 1; return; }
          if (n === 'afventer 3.part' || n === 'afventer 3. part') { park[l.id] = 'ekstern'; return; }
          if (n === 'afv') { park[l.id] = 'kollega'; return; }
          const same = projects.find((p) => norm(p.name) === n);
          if (same) { map[l.id] = same.id; return; }
          const id = 'a' + l.id; projects.push({ id, name: l.name, color: l.color }); map[l.id] = id;
        });
        const today = window.FlowHelpers.isoOf(new Date());
        const ops = [];
        data.tasks = (data.tasks || []).map((t) => {
          const old = t.labels || [];
          if (!old.length) return t;
          const n = Object.assign({}, t);
          n.labels = old.map((x) => map[x] || (projects.some((p) => p.id === x) ? x : null)).filter((x) => x && x !== t.project)
            .filter((x, i, arr) => arr.indexOf(x) === i);
          if (old.some((x) => prio[x])) n.prio = 'hoej';
          const w = old.map((x) => park[x]).filter(Boolean)[0];
          if (w && n.status !== 'faerdig') { n.status = 'pplads'; n.waiting = w === 'ekstern' ? 'ekstern' : (n.waiting || 'kollega'); n.parkedAt = n.parkedAt || today; }
          ops.push({ col: 'tasks', id: t.id, data: JSON.parse(stable(window.FlowStore.toDoc('tasks', n))) });
          return n;
        });
        data.config.projects = projects; data.config.labelDefs = [];
        ops.push({ col: 'config', data: JSON.parse(stable({ people: data.config.people, projects, labelDefs: [] })) });
        await store.write(ops);
        await store.setPrivate('migrations', Object.assign({}, mig, { areasMerged: new Date().toISOString() }));
      }
    }

    const byCol = {};
    COLS.forEach((c) => { byCol[c] = data[c] || []; });
    byCol.tasks = withSpent(byCol.tasks, byCol.entries);
    const initial = { people, projects: data.config.projects || [], labelDefs: data.config.labelDefs || [], tasks: byCol.tasks,
      notes: byCol.notes, entries: byCol.entries, stickies: byCol.stickies, templates: byCol.templates };

    if (store.getPrivate) { const t = await store.getPrivate('teams'); CFG.teamsWebhookUrl = (t && t.url) || ''; }
    const logic = new window.FlowComponent({ me: me.id, data: initial, isAdmin: admin && store.mode === 'firebase', onLogout: () => store.signOut(),
      setAccess: (uid, patch) => store.setAccess(uid, patch).catch((e) => logic.flash('Kunne ikke gemme adgang: ' + errText(e))),
      invite: store.createInvite ? async (person) => {
        const link = await store.createInvite(person, me.id);
        let copied = false;
        try { await navigator.clipboard.writeText(link); copied = true; } catch (e) {}
        const teams = !!CFG.teamsWebhookUrl;
        if (teams) postTeams({ channel: 'Teams', to: person.id, tag: 'INVITATION', task: null,
          title: 'Du er inviteret til Flow', body: 'Klik på knappen og vælg en adgangskode. Brug din e-mail ' + person.email + '.' }, logic.state, link);
        return { teams, copied };
      } : null,
      saveTeamsUrl: store.setPrivate && admin ? async (url) => { await store.setPrivate('teams', { url: url.trim(), by: me.id, ts: new Date().toISOString() }); CFG.teamsWebhookUrl = url.trim(); } : null });
    window.__flow = logic;

    // Kendt databasetilstand pr. samling
    const synced = {};
    COLS.forEach((c) => { synced[c] = new Map(initial[c].map((x) => [idOf(c, x), docJson(c, x)])); });
    const cfgJson = (s) => stable({ people: s.people, projects: s.projects, labelDefs: s.labelDefs });
    let syncedCfg = cfgJson(initial);
    let timerSynced = stable({ task: null, start: null });

    // Genskab kørende timer
    try {
      const tm = await store.getTimer(me.id);
      if (tm && tm.task && initial.tasks.some((t) => t.id === tm.task)) {
        logic.state = Object.assign({}, logic.state, { timerTask: tm.task, timerStart: tm.start });
        timerSynced = stable({ task: tm.task, start: tm.start });
      }
    } catch (e) {}

    let dirty = new Set(), timer = null, applying = false, savedTimer = null;
    function flush() {
      timer = null;
      const s = logic.state, ops = [], created = [];
      dirty.forEach((col) => {
        if (col === 'config') {
          const j = cfgJson(s);
          if (j !== syncedCfg) { syncedCfg = j; ops.push({ col: 'config', data: JSON.parse(j) }); }
          return;
        }
        if (col === 'timer') {
          const j = stable({ task: s.timerTask || null, start: s.timerStart || null });
          if (j !== timerSynced) { timerSynced = j; store.setTimer(me.id, JSON.parse(j)).catch(() => {}); }
          return;
        }
        const items = s[col] || [];
        if (col === 'entries') items.forEach((e) => { if (!e[5]) e[5] = newId('e'); });
        const cur = new Map();
        items.forEach((x) => { const id = idOf(col, x); if (id) cur.set(id, docJson(col, x)); });
        const old = synced[col];
        cur.forEach((j, id) => { if (old.get(id) !== j) { ops.push({ col, id, data: JSON.parse(j) }); if (col === 'notes' && !old.has(id)) created.push(id); } });
        old.forEach((j, id) => { if (!cur.has(id)) ops.push({ col, id, data: null }); });
        synced[col] = cur;
      });
      dirty = new Set();
      if (ops.length) store.write(ops).then(() => {
        if (logic.state.sel && ops.some((o) => o.col === 'tasks' && o.id === logic.state.sel)) {
          applying = true; try { logic.setState({ savedAt: Date.now() }); } finally { applying = false; }
          clearTimeout(savedTimer); savedTimer = setTimeout(() => { applying = true; try { logic.setState({ savedAt: null }); } finally { applying = false; } }, 2600);
        }
      }).catch((e) => { console.error(e); logic.flash('Kunne ikke gemme — tjek forbindelsen. Ændringen prøves igen.'); });
      created.forEach((id) => { const n = s.notes.find((x) => x.id === id); if (n && (n.to !== me.id || n.kind === 'stale')) postTeams(n, s); });
    }
    logic.onStateChange = (prev, next) => {
      if (applying) return;
      COLS.forEach((c) => { if (prev[c] !== next[c]) dirty.add(c); });
      if (prev.people !== next.people || prev.projects !== next.projects || prev.labelDefs !== next.labelDefs) dirty.add('config');
      if (prev.timerTask !== next.timerTask || prev.timerStart !== next.timerStart) dirty.add('timer');
      if (prev.entries !== next.entries && !applying) { /* spent opdateres af UI-logikken selv */ }
      if (dirty.size && !timer) timer = setTimeout(flush, 200);
      if (prev.sel !== next.sel) { try { history.replaceState(null, '', next.sel ? '#task=' + encodeURIComponent(next.sel) : location.pathname + location.search); } catch (e) {} }
    };

    function applyRemote(col, docs) {
      if (timer) { clearTimeout(timer); flush(); }
      const m = new Map(docs.map((x) => [idOf(col, x), docJson(col, x)]));
      const old = synced[col];
      let same = m.size === old.size;
      if (same) for (const [id, j] of m) { if (old.get(id) !== j) { same = false; break; } }
      if (same) return;
      const local = new Map((logic.state[col] || []).map((x) => [idOf(col, x), x]));
      let items = docs.map((x) => { const id = idOf(col, x); const l = local.get(id); return l && old.get(id) === m.get(id) ? l : x; });
      synced[col] = m;
      const patch = { [col]: items };
      if (col === 'entries' || col === 'tasks') patch.tasks = withSpent(col === 'tasks' ? items : logic.state.tasks, col === 'entries' ? items : logic.state.entries);
      if (col === 'tasks' && logic.state.sel && !items.some((t) => t.id === logic.state.sel)) patch.sel = null;
      if (col === 'tasks' && logic.state.timerTask && !items.some((t) => t.id === logic.state.timerTask)) { patch.timerTask = null; patch.timerStart = null; }
      applying = true;
      try { logic.setState(patch); } finally { applying = false; }
      if (patch.tasks && col === 'entries') { /* tasks ændret lokalt kun for spent – spent gemmes ikke */ }
    }
    function applyConfig(d) {
      const j = stable({ people: d.people, projects: d.projects, labelDefs: d.labelDefs });
      if (j === syncedCfg) return;
      if (timer) { clearTimeout(timer); flush(); }
      syncedCfg = j;
      applying = true;
      try { logic.setState({ people: d.people || [], projects: d.projects || [], labelDefs: d.labelDefs || [] }); } finally { applying = false; }
    }

    if (unsub) unsub();
    const u1 = store.subscribe(applyRemote, applyConfig);
    const u2 = store.watchTimer(me.id, (d) => {
      const j = stable({ task: (d && d.task) || null, start: (d && d.start) || null });
      if (j === timerSynced) return;
      timerSynced = j;
      applying = true;
      try { logic.setState({ timerTask: (d && d.task) || null, timerStart: (d && d.start) || null }); } finally { applying = false; }
    });
    const u3 = (admin && store.mode === 'firebase') ? store.watchRequests((list) => { applying = true; try { logic.setState({ accessList: list.filter((x) => !isAdmin(x.email)) }); } finally { applying = false; } }) : () => {};
    const u4 = (admin && store.mode === 'firebase') ? store.watchInvites((list) => { applying = true; try { logic.setState({ inviteList: list }); } finally { applying = false; } }) : () => {};
    unsub = () => { u1(); u2(); u3(); u4(); };
    window.addEventListener('beforeunload', () => { if (timer) { clearTimeout(timer); flush(); } });

    const m = /#task=([^&]+)/.exec(location.hash);
    if (m && initial.tasks.some((t) => t.id === decodeURIComponent(m[1]))) logic.state = Object.assign({}, logic.state, { sel: decodeURIComponent(m[1]) });

    root.render(h(window.FlowHost, { logic, key: me.id + Date.now() }));
    mounted = true;
  }

  (async function boot() {
    try {
      const style = document.createElement('style'); style.textContent = window.FlowRender.css + '\n.flow-btn:hover{opacity:.9}'; document.head.appendChild(style);
      showLoading('Starter…');
      const store = await window.FlowStore.create(CFG);
      let accUnsub = null;
      store.onAuth(async (user) => {
        if (store.invitePromise) { try { await store.invitePromise; } catch (e) { if (user) { store.signOut(); return; } } }
        if (unsub) { unsub(); unsub = null; }
        if (accUnsub) { accUnsub(); accUnsub = null; }
        if (!user) { showLogin(store); return; }
        if (store.mode === 'local' || isAdmin(user.email)) { start(store, user).catch(showError); return; }
        let started = false, asked = false;
        accUnsub = store.watchAccess(user.uid, (acc) => {
          const st = acc && acc.status;
          if (st === 'approved') { if (!started) { started = true; start(store, user, acc).catch(showError); } return; }
          if (started) { location.reload(); return; }
          if (!acc && !asked) { asked = true; store.requestAccess(user).catch(() => {}); }
          if (st === 'rejected' || st === 'revoked') showNoAccess(store, st === 'revoked' ? 'Din adgang til Flow er fjernet.' : 'Din anmodning om adgang til Flow er afvist.');
          else showPending(store, user);
        });
      });
    } catch (e) { showError(e); }
  })();

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
