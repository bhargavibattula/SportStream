async function test() {
  try {
    const response = await fetch('http://localhost:8000/');
    const text = await response.text();
    console.log('Backend response:', text);
  } catch (e) {
    console.error('Backend not responding:', e.message);
  }
}
test();
