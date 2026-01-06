
export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * 從 Google Maps URL 中提取經緯度
 * 支援格式：
 * 1. @lat,lng
 * 2. !3dLat...!4dLng
 * 3. q=lat,lng 或 ll=lat,lng
 * 4. /lat,lng
 */
export const extractCoordsFromUrl = (url: string): Coordinates | null => {
    // 1. 匹配 @lat,lng
    const atMatch = url.match(/@([-?\d\.]+),([-?\d\.]+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // 2. 匹配 !3dLat...!4dLng (支援中間有其他參數)
    const dMatch = url.match(/!3d([-?\d\.]+).*?!4d([-?\d\.]+)/);
    if (dMatch) return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };

    // 3. 匹配 q=lat,lng 或 ll=lat,lng
    const qlMatch = url.match(/[?&](?:q|ll)=([-?\d\.]+),([-?\d\.]+)/);
    if (qlMatch) return { lat: parseFloat(qlMatch[1]), lng: parseFloat(qlMatch[2]) };

    // 4. 通用匹配 /lat,lng
    const genericMatch = url.match(/\/([-?\d\.]+),([-?\d\.]+)/);
    if (genericMatch) {
        const lat = parseFloat(genericMatch[1]);
        const lng = parseFloat(genericMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }

    return null;
};

/**
 * 解析 Google Maps URL，包含處理短網址 (goo.gl / maps.app.goo.gl)
 * 若為短網址，會呼叫 Google Apps Script Proxy 還原長網址並提取座標
 */
export const resolveMapUrl = async (url: string): Promise<Coordinates | null> => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;

    // 1. 嘗試直接解析
    const directCoords = extractCoordsFromUrl(trimmedUrl);
    if (directCoords) {
        return directCoords;
    }

    // 2. 處理短網址
    if (trimmedUrl.includes('goo.gl') || trimmedUrl.includes('maps.app.goo.gl')) {
        try {
            const gasBase = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
            if (!gasBase) {
                console.warn('VITE_GOOGLE_SCRIPT_URL not configured');
                return null;
            }

            const gasUrl = `${gasBase}?url=${encodeURIComponent(trimmedUrl)}`;
            const response = await fetch(gasUrl, { redirect: 'follow' });
            const data = await response.json();

            if (data.longUrl) {
                const extracted = extractCoordsFromUrl(data.longUrl);
                if (extracted) {
                    return extracted;
                } else {
                    console.warn('[UrlParser] 解析長網址失敗，找不到座標標記');
                }
            }
        } catch (error) {
            console.error('[UrlParser] 解析失敗:', error);
        }
    }

    return null;
};
