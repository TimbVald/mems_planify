import { createClient } from '@supabase/supabase-js'

// URL et clé publique (anon) de ton projet Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Initialise le client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Upload un fichier audio sur Supabase Storage
 * @param file Le fichier audio à uploader
 * @param setProgress Fonction optionnelle pour mettre à jour la progression (0% au début, 100% à la fin)
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadAudioToSupabase(file: File, setProgress?: (progress: number) => void) {
  // Nettoie le nom du fichier
  const safeFileName = encodeURIComponent(file.name.replace(/\s+/g, '_'))

  // Génère un chemin unique pour le fichier dans le bucket 'audios'
  const filePath = `meetings/${Date.now()}_${safeFileName}`
  // Indique le début de l'upload (progression à 0%)
  if (setProgress) setProgress(0)
  // Upload le fichier dans le bucket 'audios' de Supabase Storage
  const { data, error } = await supabase.storage
    .from('audios')
    .upload(filePath, file, {
      cacheControl: '3600', // Contrôle du cache (optionnel)
      upsert: false,        // N'écrase pas un fichier existant avec le même nom
    })

  // Si une erreur survient, la remonter
  if (error) {
    console.error('Erreur Supabase :', error)
    throw error
  }

  // Indique la fin de l'upload (progression à 100%)
  if (setProgress) setProgress(100)

  // Récupère l'URL publique du fichier uploadé
  const { data: publicUrlData } = supabase
    .storage
    .from('audios')
    .getPublicUrl(filePath)

  // Retourne l'URL publique (ou undefined si non trouvée)
  return publicUrlData?.publicUrl
}
