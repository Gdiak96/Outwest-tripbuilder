export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method === "POST") {
    return res.status(200).json({
      success: true,
      message: "Flights API is working"
    });
  }

  return res.status(405).json({
    error: "Method not allowed"
  });
}
