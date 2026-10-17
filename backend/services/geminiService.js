const ApiError = require('../utils/ApiError');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function suggestTattooName({ file, categoryName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI name suggestions are not configured. Add GEMINI_API_KEY to the backend environment.');

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Suggest one concise, descriptive name of 2 to 6 words for this tattoo design image${categoryName ? ` in the "${categoryName}" category` : ''}. Return only the name, with no quotes, numbering, or explanation.`,
            },
            {
              inlineData: {
                mimeType: file.mimetype,
                data: file.buffer.toString('base64'),
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 40 },
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new ApiError(502, `Could not reach Google Gemini for a name suggestion: ${err.message}`);
  }

  if (!response.ok) {
    throw new ApiError(502, `Google Gemini name suggestion failed (HTTP ${response.status}). Check the API key, model access, and quota.`);
  }

  let result;
  try {
    result = await response.json();
  } catch (err) {
    throw new ApiError(502, `Google Gemini returned an invalid response: ${err.message}`);
  }

  const name = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join(' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  if (!name || name.length < 2) throw new ApiError(502, 'Google Gemini did not return a usable tattoo name.');
  return name;
}

module.exports = { suggestTattooName };
