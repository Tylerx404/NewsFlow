import { describe, expect, it } from "bun:test";

import {
  detectFeedLanguage,
  inferFeedCountry,
  mapLanguageToCountry,
} from "./feed-country-inference.service";

describe("feed country inference", () => {
  it("detects Vietnamese content", () => {
    const result = detectFeedLanguage({
      title: "Tin tuc cong nghe Viet Nam",
      description:
        "Bai viet nay noi ve cong nghe, kinh te va doi song tai Viet Nam. Noi dung du dai de vuot nguong phat hien ngon ngu cua bo detect.",
      items: [
        {
          title:
            "Thi truong cong nghe tang truong manh voi nhieu du an tri tue nhan tao va chuyen doi so",
          summary:
            "Nội dung tiếng Việt có dấu được thêm vào để tăng độ chắc chắn cho bộ nhận diện ngôn ngữ. Việt Nam đang mở rộng đầu tư vào trí tuệ nhân tạo, điện toán đám mây và hạ tầng số.",
        },
        {
          title: "Doanh nghiep Viet Nam day manh doi moi sang tao",
          summary:
            "Nhiều doanh nghiệp công nghệ trong nước mở rộng nghiên cứu sản phẩm, tăng năng lực cạnh tranh và phục vụ thị trường toàn cầu.",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result?.language).toBe("vi");
  });

  it("returns null for short noisy content", () => {
    const result = detectFeedLanguage({
      title: "hi",
      description: "ok",
      items: [],
    });

    expect(result).toBeNull();
  });

  it("maps multilingual languages to GLOBAL in v1", () => {
    expect(mapLanguageToCountry("en")).toBe("GLOBAL");
    expect(mapLanguageToCountry("es")).toBe("GLOBAL");
  });

  it("maps English to ccTLD country when domain hint exists", () => {
    expect(
      mapLanguageToCountry("en", {
        sourceUrl: "https://en.yna.co.kr/RSS/news.xml",
      })
    ).toBe("KR");
  });

  it("maps France24 English feed to FR using host hint", () => {
    expect(
      mapLanguageToCountry("en", {
        sourceUrl: "https://www.france24.com/en/france/rss",
      })
    ).toBe("FR");
  });

  it("maps ElPais English feed to ES using host hint", () => {
    expect(
      mapLanguageToCountry("en", {
        sourceUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada",
      })
    ).toBe("ES");
  });

  it("keeps GLOBAL for English when domain hint is absent", () => {
    expect(
      mapLanguageToCountry("en", {
        sourceUrl: "https://example.com/rss.xml",
      })
    ).toBe("GLOBAL");
  });

  it("maps single-country language to expected country", () => {
    expect(mapLanguageToCountry("vi")).toBe("VN");
    expect(mapLanguageToCountry("th")).toBe("TH");
  });

  it("falls back to GLOBAL when inference is not possible", () => {
    const result = inferFeedCountry({
      title: "a",
      description: "b",
      items: [],
      defaultCountryCode: "GLOBAL",
    });

    expect(result.inferredLanguage).toBeNull();
    expect(result.inferredCountryCode).toBe("GLOBAL");
    expect(result.inferenceSource).toBe("DEFAULT");
  });

  it("uses domain country when language detection is not possible", () => {
    const result = inferFeedCountry({
      title: "News",
      description: "Latest headlines",
      items: [],
      sourceUrl: "https://en.yna.co.kr/RSS/news.xml",
      defaultCountryCode: "GLOBAL",
    });

    expect(result.inferredLanguage).toBeNull();
    expect(result.inferredCountryCode).toBe("KR");
    expect(result.inferenceSource).toBe("DEFAULT");
  });

  it("uses host hint for country resolution on France24", () => {
    const result = inferFeedCountry({
      title: "Latest news reports on FRANCE, French politics and culture",
      description: "short",
      items: [],
      sourceUrl: "https://www.france24.com/en/france/rss",
      defaultCountryCode: "GLOBAL",
    });

    expect(result.inferredCountryCode).toBe("FR");
    expect(["DEFAULT", "LANG_DETECTION"]).toContain(result.inferenceSource);
  });

  it("infers KR for English feed on .kr domain", () => {
    const result = inferFeedCountry({
      title: "Korea news in English",
      description:
        "South Korea economy and politics updates from Seoul with detailed context for international readers.",
      items: [
        {
          title: "Korean market update",
          summary: "The KOSPI closed higher amid gains in chipmakers and battery producers.",
        },
      ],
      sourceUrl: "https://en.yna.co.kr/RSS/news.xml",
      defaultCountryCode: "GLOBAL",
    });

    expect(result.inferredLanguage).toBe("en");
    expect(result.inferredCountryCode).toBe("KR");
    expect(result.inferenceSource).toBe("LANG_DETECTION");
  });
});
