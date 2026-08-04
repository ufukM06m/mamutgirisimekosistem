/**
 * MamutHub iFrame Auto-Resize Helper Script
 * Place this script on your website (WordPress, Vercel, Webflow, HTML etc.)
 */
(function() {
  function initAutoResize() {
    window.addEventListener('message', function(event) {
      if (!event.data || event.data.type !== 'MAMUTHUB_RESIZE') return;
      
      var rawHeight = event.data.height;
      if (typeof rawHeight !== 'number' || rawHeight <= 0) return;

      // Add precise safety margin (20px) to prevent bottom clipping
      var targetHeight = rawHeight + 20;

      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        var iframe = iframes[i];
        var isMatch = false;

        try {
          if (iframe.contentWindow === event.source) {
            isMatch = true;
          }
        } catch (e) {}

        if (!isMatch && iframe.src && (iframe.src.indexOf('embed=true') !== -1 || iframe.src.indexOf('view=map') !== -1)) {
          isMatch = true;
        }

        if (isMatch) {
          var currentHeight = parseInt(iframe.style.height || iframe.getAttribute('height') || '0', 10);
          if (Math.abs(currentHeight - targetHeight) > 5) {
            iframe.style.height = targetHeight + 'px';
            iframe.setAttribute('height', targetHeight.toString());
          }
        }
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAutoResize();
  } else {
    document.addEventListener('DOMContentLoaded', initAutoResize);
  }
})();
