import { MediaProviderRouter } from './src/server/providers/MediaProviderRouter';
import { getVideoProvider } from './src/server/providers/index';
import { CreditService, resolveCanonicalModelId } from './server/creditService';

async function runRegressionTests() {
  console.log('=== STARTING REGRESSION TEST SUITE FOR PROVIDER COLLISION FIX ===');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Google + veo3-1 => google_veo
    const route1 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'veo3-1',
      preferredProvider: 'google'
    });
    assert(route1.providerId === 'google_veo', `Google + veo3-1 resolves to google_veo (got: ${route1.providerId})`);
    assert(route1.allowFallback === false, `Google + veo3-1 allowFallback is false`);
    const provider1 = getVideoProvider(route1.model, route1.providerId);
    assert(provider1.constructor.name === 'GoogleVeoAdapter', `Google + veo3-1 resolves to GoogleVeoAdapter`);

    // 2. Fal + veo3-1 => fal
    const route2 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'veo3-1',
      preferredProvider: 'fal'
    });
    assert(route2.providerId === 'fal', `Fal + veo3-1 resolves to fal (got: ${route2.providerId})`);
    assert(route2.allowFallback === false, `Fal + veo3-1 allowFallback is false`);
    const provider2 = getVideoProvider(route2.model, route2.providerId);
    assert(provider2.constructor.name === 'FalVideoAdapter', `Fal + veo3-1 resolves to FalVideoAdapter`);

    // 3. OpenArt + veo3-1 => openart
    const route3 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'veo3-1',
      preferredProvider: 'openart'
    });
    assert(route3.providerId === 'openart', `OpenArt + veo3-1 resolves to openart (got: ${route3.providerId})`);
    assert(route3.allowFallback === false, `OpenArt + veo3-1 allowFallback is false`);
    const provider3 = getVideoProvider(route3.model, route3.providerId);
    assert(provider3.constructor.name === 'OpenArtMCPAdapter', `OpenArt + veo3-1 resolves to OpenArtMCPAdapter`);


    // 4. Google + wan2-7 => google_veo
    const route4 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'wan2-7',
      preferredProvider: 'google'
    });
    assert(route4.providerId === 'google_veo', `Google + wan2-7 resolves to google_veo (got: ${route4.providerId})`);
    assert(route4.allowFallback === false, `Google + wan2-7 allowFallback is false`);
    const provider4 = getVideoProvider(route4.model, route4.providerId);
    assert(provider4.constructor.name === 'GoogleVeoAdapter', `Google + wan2-7 resolves to GoogleVeoAdapter`);

    // 5. Fal + wan2-7 => fal
    const route5 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'wan2-7',
      preferredProvider: 'fal'
    });
    assert(route5.providerId === 'fal', `Fal + wan2-7 resolves to fal (got: ${route5.providerId})`);
    assert(route5.allowFallback === false, `Fal + wan2-7 allowFallback is false`);
    const provider5 = getVideoProvider(route5.model, route5.providerId);
    assert(provider5.constructor.name === 'FalVideoAdapter', `Fal + wan2-7 resolves to FalVideoAdapter`);

    // 6. OpenArt + wan2-7 => openart
    const route6 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'wan2-7',
      preferredProvider: 'openart'
    });
    assert(route6.providerId === 'openart', `OpenArt + wan2-7 resolves to openart (got: ${route6.providerId})`);
    assert(route6.allowFallback === false, `OpenArt + wan2-7 allowFallback is false`);
    const provider6 = getVideoProvider(route6.model, route6.providerId);
    assert(provider6.constructor.name === 'OpenArtMCPAdapter', `OpenArt + wan2-7 resolves to OpenArtMCPAdapter`);


    // 7. BytePlus + byte-plus-seedance-2 => byteplus
    const route7 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'byte-plus-seedance-2',
      preferredProvider: 'byteplus'
    });
    assert(route7.providerId === 'byteplus', `BytePlus + byte-plus-seedance-2 resolves to byteplus (got: ${route7.providerId})`);
    assert(route7.allowFallback === false, `BytePlus + byte-plus-seedance-2 allowFallback is false`);
    const provider7 = getVideoProvider(route7.model, route7.providerId);
    assert(provider7.constructor.name === 'BytePlusAdapter', `BytePlus + byte-plus-seedance-2 resolves to BytePlusAdapter`);

    // 8. OpenArt + byte-plus-seedance-2 => openart
    const route8 = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'byte-plus-seedance-2',
      preferredProvider: 'openart'
    });
    assert(route8.providerId === 'openart', `OpenArt + byte-plus-seedance-2 resolves to openart (got: ${route8.providerId})`);
    assert(route8.allowFallback === false, `OpenArt + byte-plus-seedance-2 allowFallback is false`);
    const provider8 = getVideoProvider(route8.model, route8.providerId);
    assert(provider8.constructor.name === 'OpenArtMCPAdapter', `OpenArt + byte-plus-seedance-2 resolves to OpenArtMCPAdapter`);


    // 9. Alias canonicalization context isolation
    // "openart-veo2" in openart context => "veo3-1"
    const canonWithOpenArt = resolveCanonicalModelId('openart-veo2', 'OpenArt');
    assert(canonWithOpenArt === 'veo3-1', `openart-veo2 in OpenArt context resolves to veo3-1 (got: ${canonWithOpenArt})`);

    // "openart-veo2" in Google context should NOT globally override to "veo3-1" unless it starts with "openart-"
    // wait, if it starts with "openart-", it can resolve to veo3-1 since it contains the provider name explicitly.
    // What if the user requests bare model "veo2"?
    const bareCanonWithOpenArt = resolveCanonicalModelId('veo2', 'OpenArt');
    assert(bareCanonWithOpenArt === 'veo3-1', `bare "veo2" in OpenArt context resolves to veo3-1 (got: ${bareCanonWithOpenArt})`);

    const bareCanonWithGoogle = resolveCanonicalModelId('veo2', 'Google');
    assert(bareCanonWithGoogle === 'veo2', `bare "veo2" in Google context does NOT canonicalize to veo3-1 (got: ${bareCanonWithGoogle})`);


    // 10. Fallback and failure handling (allowFallback = false)
    const routeFailure = MediaProviderRouter.resolveRoute('VIDEO', {
      preferredModelOrEngine: 'veo3-1',
      preferredProvider: 'openart'
    });
    assert(routeFailure.allowFallback === false, `Explicit OpenArt route has allowFallback set to false`);

  } catch (err: any) {
    console.error('Unexpected error during regression testing:', err);
    failed++;
  }

  console.log('\n=============================================');
  console.log(`REGRESSION TEST RESULT: ${passed} PASSED, ${failed} FAILED.`);
  console.log('=============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegressionTests();
