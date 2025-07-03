// Gemini API utility function
export const callGeminiAPI = async (prompt, responseSchema) => {
  let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
  
  // If no schema is provided, expect plain text response
  const generationConfig = responseSchema 
    ? {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    : {
        // Plain text response
        temperature: 0.7,
        maxOutputTokens: 8192
      };
  
  const payload = {
    contents: chatHistory,
    generationConfig: generationConfig
  };

  // Replace with your actual API key
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("API Error:", errorData);
    throw new Error(`APIリクエスト失敗 ステータス ${response.status}: ${errorData?.error?.message || '不明なエラー'}`);
  }

  const result = await response.json();

  if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
    let rawText = result.candidates[0].content.parts[0].text;
    
    // If no schema was provided, return plain text
    if (!responseSchema) {
      return rawText;
    }
    
    // Otherwise, parse JSON response
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch && jsonMatch[1]) {
      rawText = jsonMatch[1];
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        rawText = rawText.substring(firstBrace, lastBrace + 1);
      }
    }

    if (!rawText.trim()) {
      console.warn("LLM response was empty after cleaning. Raw response:", result.candidates[0].content.parts[0].text);
      return null;
    }

    try {
      return JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse cleaned JSON:", rawText, e);
      throw new Error("LLM応答のJSON解析に失敗しました。クリーニング後も無効な形式です。");
    }
  } else {
    console.warn("予期しないLLM応答構造、またはテキスト部分が空です:", result);
    return null;
  }
};
