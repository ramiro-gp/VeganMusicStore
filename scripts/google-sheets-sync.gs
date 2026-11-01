/** @OnlyCurrentDoc */
/** Bound Apps Script for the catalog spreadsheet. No credentials belong in this file. */
var VMS_REPOSITORY = 'ramiro-gp/VeganMusicStore';
var VMS_WORKFLOW = 'catalog-sync.yml';
var VMS_ACTIONS_URL = 'https://github.com/' + VMS_REPOSITORY + '/actions/workflows/' + VMS_WORKFLOW;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Vegan Store Music')
    .addItem('Sincronizar web', 'mostrarSincronizacion').addToUi();
}

function mostrarSincronizacion() {
  var html = HtmlService.createHtmlOutput(
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><style>' +
    'body{font:14px system-ui;padding:16px;color:#25212b}button{padding:12px 18px;border:0;border-radius:4px;background:#d4b8ee;color:#25212b;font:inherit;cursor:pointer}button:disabled{opacity:.5}p{line-height:1.5}a{color:#594070}' +
    '</style></head><body><h2>Vegan Store Music</h2><p>Guardá tus cambios y solicitá la actualización del catálogo en veganrecords.com.ar.</p>' +
    '<button id="sync" onclick="sync()">Sincronizar web</button><p id="status" role="status" aria-live="polite"></p>' +
    '<a id="result" target="_blank" rel="noopener" hidden>Revisar ejecución</a>' +
    '<p>La publicación puede tardar unos minutos. Si hay datos inválidos, se conserva la web anterior.</p>' +
    '<script>function sync(){var b=document.getElementById("sync"),s=document.getElementById("status"),a=document.getElementById("result");b.disabled=true;a.hidden=true;s.textContent="Enviando solicitud…";' +
    'google.script.run.withSuccessHandler(function(r){s.textContent="Solicitud enviada. La web se actualizará cuando finalice la publicación.";a.href=r.url;a.hidden=false;setTimeout(function(){b.disabled=false},60000)})' +
    '.withFailureHandler(function(e){s.textContent=e.message||"No se pudo solicitar la actualización.";b.disabled=false}).sincronizarWeb();}</script></body></html>'
  ).setTitle('Sincronizar web');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Entry point called by the sidebar. Assign drawings to mostrarSincronizacion. */
function sincronizarWeb() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Ya se está enviando una solicitud. Esperá un momento.');
  try {
    var properties = PropertiesService.getScriptProperties();
    var token = properties.getProperty('VMS_GITHUB_TOKEN');
    if (!token) throw new Error('Falta configurar la conexión con GitHub. Contactá al administrador.');
    var last = Number(properties.getProperty('VMS_LAST_SYNC_REQUEST') || 0);
    if (Date.now() - last < 60000) throw new Error('Ya se solicitó una sincronización. Esperá 60 segundos antes de repetirla.');
    SpreadsheetApp.flush();
    var response = UrlFetchApp.fetch('https://api.github.com/repos/' + VMS_REPOSITORY + '/actions/workflows/' + VMS_WORKFLOW + '/dispatches', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      payload: JSON.stringify({ ref: 'main' }),
      muteHttpExceptions: true,
      followRedirects: false
    });
    var code = response.getResponseCode();
    if (code !== 200 && code !== 204) {
      if (code === 401 || code === 403) throw new Error('GitHub rechazó la conexión. Revisá permisos o vencimiento de la credencial.');
      if (code === 404) throw new Error('No se encontró el workflow o la credencial no tiene acceso al repositorio.');
      throw new Error('No se pudo enviar la solicitud (GitHub HTTP ' + code + '). Intentá más tarde.');
    }
    properties.setProperty('VMS_LAST_SYNC_REQUEST', String(Date.now()));
    var url = VMS_ACTIONS_URL;
    try {
      var body = JSON.parse(response.getContentText() || '{}');
      if (typeof body.html_url === 'string' && body.html_url.indexOf('https://github.com/' + VMS_REPOSITORY + '/actions/runs/') === 0) url = body.html_url;
    } catch (ignored) { /* Older GitHub versions return an empty response. */ }
    return { url: url };
  } finally {
    lock.releaseLock();
  }
}
