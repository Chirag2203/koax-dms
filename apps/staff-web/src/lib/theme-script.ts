/**
 * Inline script that runs before React hydrates to prevent theme flash.
 * Staff surface defaults to 'dark' (not system — per Design 03 dark-first).
 * This file has NO 'use client' directive — it is importable by server components.
 */
export function getStaffThemeScript(): string {
  return `(function(){
  var c='bn-staff-theme',k='bn-staff-theme';
  function getCookie(n){var v=document.cookie.match('(^|;)\\\\s*'+n+'\\\\s*=\\\\s*([^;]+)');return v?v.pop():null;}
  var stored=getCookie(c);
  if(!stored){try{stored=localStorage.getItem(k);}catch(e){}}
  var mode=(['light','dark'].indexOf(stored)>-1)?stored:'dark';
  document.documentElement.setAttribute('data-theme',mode);
})();`;
}
