const API_BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('Testing API endpoints...\n');
  
  const endpoints = [
    { name: 'Testimonials', url: `${API_BASE_URL}/testimonials` },
    { name: 'Team', url: `${API_BASE_URL}/team` },
    { name: 'Highlight', url: `${API_BASE_URL}/highlight/highlight` },
    { name: 'Blog (Recent)', url: `${API_BASE_URL}/blog/blogs/recent` },
    { name: 'Blog (All)', url: `${API_BASE_URL}/blog/blogs?page=1&limit=10` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}: ${endpoint.url}`);
      const response = await fetch(endpoint.url);
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      console.log('---\n');
    } catch (error) {
      console.error(`Error testing ${endpoint.name}:`, error.message);
      console.log('---\n');
    }
  }
}

testEndpoints();