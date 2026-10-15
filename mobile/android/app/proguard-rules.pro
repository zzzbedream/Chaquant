# ProGuard and R8 Optimization Rules for Chaquant Protocol
# Preserva símbolos nativos de Rust compilados vía UniFFI y JNA

# 1. Preservar JNA (Java Native Access)
-keepclassmembers class * extends com.sun.jna.** { *; }
-keep class com.sun.jna.** { *; }
-dontwarn com.sun.jna.**

# 2. Preservar Bindings UniFFI de Rust (chaquant_core)
-keep class uniffi.chaquant_core.** { *; }
-keepclassmembers class uniffi.chaquant_core.** { *; }
-keep interface uniffi.chaquant_core.** { *; }

# 3. Preservar firmas nativas JNI extern "C" de chaquant_core
-keepclasseswithmembernames class * {
    native <methods>;
}

-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# 4. Firmas C-ABI críticas de core-engine/src/
# chaquant_generate_identity
# chaquant_pqxdh_initiate
# chaquant_pqxdh_respond
# chaquant_spqr_ratchet_step
# chaquant_fec_encode
# chaquant_fec_decode
# chaquant_sphinx_encapsulate
# chaquant_sphinx_decapsulate
# chaquant_duress_wipe_ram
# chaquant_generate_destruction_receipt
# chaquant_verify_destruction_receipt
-keepnames class tech.chaquant.protocol.core.** {
    public *;
}

# 5. Seguridad Biométrica y Criptográfica AndroidX
-keep class androidx.biometric.** { *; }
-keep class androidx.security.crypto.** { *; }

# 6. SQLCipher / SQLite bindings
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**
