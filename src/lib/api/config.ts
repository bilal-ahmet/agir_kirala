/**
 * Mobil istemci yapılandırması.
 *
 * Web'de deploy = herkes anında yeni sürümde. Mobilde aylar önceki bir sürüm
 * hâlâ istek atıyor olabilir ve mağaza güncellemesini bekleyemezsiniz. Bu uç,
 * eski istemcileri uzaktan "güncelleyin" ekranına düşürmeyi ve gerektiğinde
 * bakım moduna almayı sağlar.
 */

export interface AppConfig {
  /** İstemci kendi sürümünü bununla kıyaslar; küçükse zorunlu güncelleme gösterir. */
  minSupportedVersion: { ios: string; android: string };
  maintenance: { active: boolean; message: string | null };
  storeUrls: { appStore: string | null; playStore: string | null };
}

export function getAppConfig(): AppConfig {
  return {
    minSupportedVersion: {
      ios: process.env.API_MIN_VERSION_IOS ?? "1.0.0",
      android: process.env.API_MIN_VERSION_ANDROID ?? "1.0.0",
    },
    maintenance: {
      active: process.env.API_MAINTENANCE === "1",
      message: process.env.API_MAINTENANCE_MESSAGE ?? null,
    },
    storeUrls: {
      appStore: process.env.STORE_URL_APP_STORE ?? null,
      playStore: process.env.STORE_URL_PLAY_STORE ?? null,
    },
  };
}
