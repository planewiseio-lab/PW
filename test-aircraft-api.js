// Test script for aircraft API with authentication
const testAircraftAPI = async () => {
  const baseUrl = "http://localhost:3001";
  const registration = "c-frsr";
  
  console.log(`🧪 Testing aircraft API for ${registration}...`);
  
  try {
    // Test images API first (should work without auth)
    console.log("\n1. Testing images API (no auth required)...");
    const imagesResponse = await fetch(`${baseUrl}/api/images?q=${registration}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    console.log(`   Status: ${imagesResponse.status}`);
    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      console.log(`   ✅ Images found: ${imagesData.images?.length || 0}`);
    } else {
      console.log(`   ❌ Images API failed`);
    }
    
    // Test aircraft API (requires auth - will return 401)
    console.log("\n2. Testing aircraft API (auth required)...");
    const aircraftResponse = await fetch(`${baseUrl}/api/aircraft/${registration}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    console.log(`   Status: ${aircraftResponse.status}`);
    console.log(`   Headers: X-Credits-Charged=${aircraftResponse.headers.get("X-Credits-Charged")}`);
    
    if (aircraftResponse.status === 401) {
      console.log(`   ✅ Correctly requires authentication`);
    } else if (aircraftResponse.ok) {
      const aircraftData = await aircraftResponse.json();
      console.log(`   ✅ Aircraft data received`);
    } else {
      const error = await aircraftResponse.json();
      console.log(`   ❌ Error:`, error);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
  }
};

// Run the test
testAircraftAPI().catch(console.error);
