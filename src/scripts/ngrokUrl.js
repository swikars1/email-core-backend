async function logNgrokUrl() {
  try {
    const response = await fetch("http://localhost:4040/api/tunnels");
    const data = await response.json();
    const publicUrl = data.tunnels[0].public_url;
    console.log(publicUrl);
  } catch (error) {
    console.error("Error fetching ngrok URL:", error);
  }
}
logNgrokUrl();
