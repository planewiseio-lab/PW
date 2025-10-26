// Test script for the new dual credit system
// This tests the aircraft lookup with 2 credits (1 for data + 1 for images)

const testAircraftLookup = async () => {
  const registration = "C-GHPQ";
  const baseUrl = "http://localhost:3000";
  
  console.log(`🧪 Testing aircraft lookup for ${registration}...`);
  console.log("Expected: 2 credits charged (1 for data + 1 for images)");
  
  try {
    // Test aircraft lookup (should charge 2 credits)
    const response = await fetch(`${baseUrl}/api/aircraft/${registration}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`);
    console.log(`   X-Credits-Remaining: ${response.headers.get("X-Credits-Remaining")}`);
    console.log(`   X-Credits-Charged: ${response.headers.get("X-Credits-Charged")}`);
    console.log(`   X-Charged-Actions: ${response.headers.get("X-Charged-Actions")}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Aircraft lookup successful`);
      console.log(`📋 Aircraft data received:`, {
        registration: data.reg,
        model: data.model,
        airline: data.airlineName,
        hasData: !!data.reg
      });
    } else {
      const error = await response.json();
      console.log(`❌ Aircraft lookup failed:`, error);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
  }
};

const testImagesAPI = async () => {
  const registration = "C-GHPQ";
  const baseUrl = "http://localhost:3000";
  
  console.log(`\n🧪 Testing images API for ${registration}...`);
  console.log("Expected: No credits charged (already charged in aircraft lookup)");
  
  try {
    // Test images API (should not charge credits)
    const response = await fetch(`${baseUrl}/api/images?q=${registration}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`);
    console.log(`   X-Credits-Remaining: ${response.headers.get("X-Credits-Remaining")}`);
    console.log(`   X-Credits-Charged: ${response.headers.get("X-Credits-Charged")}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Images API successful`);
      console.log(`📋 Images received:`, {
        count: data.images?.length || 0,
        hasImages: (data.images?.length || 0) > 0
      });
    } else {
      const error = await response.json();
      console.log(`❌ Images API failed:`, error);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
  }
};

const runTests = async () => {
  console.log("🚀 Starting dual credit system tests...\n");
  
  await testAircraftLookup();
  await testImagesAPI();
  
  console.log("\n✅ Tests completed!");
};

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

module.exports = { testAircraftLookup, testImagesAPI, runTests };
