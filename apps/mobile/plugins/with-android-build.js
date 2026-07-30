const {
  withAppBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

/**
 * Gradle performance + per-ABI split tuning that survives `expo prebuild`.
 *
 * gradle.properties:
 *   - bigger heap + metaspace, parallel build cache, daemon on, PNG
 *     crunching off (needless on modern Android and costs real time).
 *
 * app/build.gradle:
 *   - `versionCode` is read from `-Pandroid.versionCode` (default 1) so CI
 *     can pass `run_number * 10000`; with ABI splits enabled the per-ABI
 *     versionCode offsets can never invert ordering between builds.
 *   - a `splits { abi { ... } }` block gated on `-Pandroid.buildAbiSplits=true`
 *     emits one APK per ABI plus a universal APK during release builds. Dev
 *     builds instead pass `-PreactNativeArchitectures=arm64-v8a` and skip
 *     splits for a single fast APK.
 */
const withAndroidBuild = (config) => {
  // ── gradle.properties ──────────────────────────────────────────────────
  config = withGradleProperties(config, (c) => {
    const props = c.modResults;
    const set = (key, value) => {
      const existing = props.find(
        (p) => p.type === 'property' && p.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    set('org.gradle.jvmargs', '-Xmx4g -XX:MaxMetaspaceSize=1g');
    set('org.gradle.parallel', 'true');
    set('org.gradle.caching', 'true');
    set('org.gradle.daemon', 'true');
    set('android.enablePngCrunchInReleaseBuilds', 'false');

    return c;
  });

  // ── app/build.gradle ───────────────────────────────────────────────────
  config = withAppBuildGradle(config, (c) => {
    let code = c.modResults.contents;

    // Allow CI to pass -Pandroid.versionCode=<n>; default to 1.
    code = code.replace(
      /(\bversionCode\s+)\d+/,
      `$1(findProperty('android.versionCode') ?: '1').toInteger()`
    );

    // Inject ABI splits inside the android { } block. Disabled unless
    // -Pandroid.buildAbiSplits=true is passed (release builds only).
    const SPLITS = [
      '    splits {',
      '        abi {',
      '            reset()',
      "            enable (findProperty('android.buildAbiSplits')?.toBoolean() ?: false)",
      '            universalApk true',
      "            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'",
      '        }',
      '    }',
      '',
    ].join('\n');

    if (!code.includes('android.buildAbiSplits')) {
      code = code.replace(/android\s*\{/, `android {\n${SPLITS}`);
    }

    c.modResults.contents = code;
    return c;
  });

  return config;
};

module.exports = withAndroidBuild;
