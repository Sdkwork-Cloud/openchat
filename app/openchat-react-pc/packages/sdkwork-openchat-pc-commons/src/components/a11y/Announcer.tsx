/**
 * 鏃犻殰纰嶉€氱煡鍏憡缁勪欢
 *
 * 鑱岃矗锛氫负灞忓箷闃呰鍣ㄦ彁渚涘姩鎬佸唴瀹规洿鏂? */

import { memo } from 'react';

/**
 * 閫氱煡鍏憡缁勪欢
 * 鐢ㄤ簬鍚戝睆骞曢槄璇诲櫒瀹ｅ竷閲嶈淇℃伅
 */
export const Announcer = memo(() => {
  return (
    <>
      {/* 绀艰矊閫氱煡 - 涓嶄腑鏂綋鍓嶉槄璇?*/}
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* 绱ф€ラ€氱煡 - 绔嬪嵆涓柇褰撳墠闃呰 */}
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
});

Announcer.displayName = 'Announcer';

/**
 * 璺宠繃閾炬帴缁勪欢
 * 鍏佽閿洏鐢ㄦ埛璺宠繃瀵艰埅鐩存帴璁块棶涓诲唴瀹? */
export const SkipLink = memo(() => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0EA5E9] focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9]"
    >
      璺宠浆鍒颁富鍐呭
    </a>
  );
});

SkipLink.displayName = 'SkipLink';

export default Announcer;

