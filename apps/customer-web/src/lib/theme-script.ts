/**
 * Inline script that runs before React hydrates to prevent theme flash.
 * This file has NO 'use client' directive — it is importable by server components.
 */
export function getThemeScript(): string {
  return `(function(){
  var c='bn-theme',k='bn-theme';
  function getCookie(n){var v=document.cookie.match('(^|;)\\\\s*'+n+'\\\\s*=\\\\s*([^;]+)');return v?v.pop():null;}
  var stored=getCookie(c);
  if(!stored){try{stored=localStorage.getItem(k);}catch(e){}}
  var mode=(['light','dark','system'].indexOf(stored)>-1)?stored:'system';
  var resolved=mode==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
  document.documentElement.setAttribute('data-theme',resolved);
})();`;
}
