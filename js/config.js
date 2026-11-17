/* Supabase bağlantısı
   Supabase panelinde: Project Settings > API
   - "Project URL" değerini supabaseUrl'e,
   - "anon public" (veya "Publishable") anahtarını supabaseAnonKey'e yapıştırın.
   Bu anahtar herkese açık olacak şekilde tasarlanmıştır; güvenliği tablodaki
   satır düzeyi güvenlik kuralları sağlar. "service_role" / "secret" anahtarını ASLA buraya koymayın.
   İkisi de boş kalırsa form, e-posta uygulamasını açarak çalışmaya devam eder. */
window.POSAIDON_CONFIG = {
  supabaseUrl: 'https://dxwfxmqxaprjkfdhfvlo.supabase.co',
  supabaseAnonKey: 'sb_publishable_NGn3FEG1FgWOwGq5bnUDwA_ZBTutcEO',
};
