async function test() {
  try {
    const response = await fetch('http://localhost:8000/matches');
    const json = await response.json();
    console.log('Matches response:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Matches request failed:', e.message);
  }
}
test();
