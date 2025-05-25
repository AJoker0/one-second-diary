// gif.js - browser GIF encoder using gif.js (https://jnordberg.github.io/gif.js/)
// Load GIF library from CDN for lightweight usage
if (!window.GIF) {
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';
  document.head.appendChild(script);
  script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
  document.head.appendChild(script);
}