export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "Out West Flights AI API is working"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { images } = req.body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No flight screenshots received"
      });
    }

    if (images.length > 6) {
      return res.status(400).json({
        success: false,
        error: "Maximum 6 screenshots allowed"
      });
    }

    const content = [
      {
        type: "input_text",
        text: `
You are the flight-reading assistant for Out West Travel Agency.

Analyze ALL uploaded flight screenshots together.

The screenshots may contain different segments of the same journey.
Do not treat every screenshot as a separate journey.

Your job:

1. Read every visible flight segment.
2. Identify the complete OUTBOUND journey.
3. Identify the complete RETURN journey.
4. Chain connecting flights together based on airports, dates and times.
5. Calculate or identify layovers between connecting flights.
6. Preserve local departure and arrival dates/times exactly as shown.
7. Do not invent information that is not visible.
8. If something cannot be determined, use null.

Example:

ATH → FCO
FCO → LAX

must become one outbound journey:

ATH → LAX
1 stop: FCO

while still keeping both individual segments.

Return ONLY valid JSON.

Use exactly this structure:

{
  "outbound": {
    "origin": "",
    "destination": "",
    "departureDate": "",
    "departureTime": "",
    "arrivalDate": "",
    "arrivalTime": "",
    "airline": "",
    "totalDuration": "",
    "stops": [],
    "layovers": [
      {
        "airport": "",
        "duration": ""
      }
    ],
    "segments": [
      {
        "airline": "",
        "flightNumber": "",
        "from": "",
        "to": "",
        "departureDate": "",
        "departureTime": "",
        "arrivalDate": "",
        "arrivalTime": "",
        "duration": ""
      }
    ]
  },
  "return": {
    "origin": "",
    "destination": "",
    "departureDate": "",
    "departureTime": "",
    "arrivalDate": "",
    "arrivalTime": "",
    "airline": "",
    "totalDuration": "",
    "stops": [],
    "layovers": [
      {
        "airport": "",
        "duration": ""
      }
    ],
    "segments": [
      {
        "airline": "",
        "flightNumber": "",
        "from": "",
        "to": "",
        "departureDate": "",
        "departureTime": "",
        "arrivalDate": "",
        "arrivalTime": "",
        "duration": ""
      }
    ]
  }
}
`
      },

      ...images.map((image) => ({
        type: "input_image",
        image_url: image
      }))
    ];

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-terra",
          input: [
            {
              role: "user",
              content
            }
          ]
        })
      }
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI API error:", data);

      return res.status(openAIResponse.status).json({
        success: false,
        error:
          data?.error?.message ||
          "OpenAI API request failed"
      });
    }

    let text = data.output_text;

    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part.type === "output_text" && part.text) {
              text = part.text;
              break;
            }
          }
        }
        if (text) break;
      }
    }

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "AI returned no readable flight data"
      });
    }

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let flights;

    try {
      flights = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", text);

      return res.status(500).json({
        success: false,
        error: "AI response could not be converted to flight data",
        raw: text
      });
    }

    return res.status(200).json({
      success: true,
      flights
    });

  } catch (error) {
    console.error("Read flights error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unexpected server error"
    });
  }
}
