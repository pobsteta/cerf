// Mission 008 : décide si le workflow release-plugin.yml publie (plugin/PLAN.md § 12 point 10).
// Décision de Pascal du 3 novembre 2026 : sur main, la release « plugin-v<version> » n'est
// publiée que si un fichier sous plugin/ a changé dans le push ; sinon sortie verte.
// Écrit pour Cerf, sans dépendance.
//
// Usage (dans le workflow) : node outils/decider-release.mjs <evenement> <branche> <avant> <sha>
//   écrit « publier » ou « ignorer » sur la sortie standard, puis une raison sur la sortie
//   d'erreur. Code de sortie 0 dans les deux cas.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const AVANT_NUL = /^0{40}$/;

// Vrai si un des fichiers est sous plugin/ (chemins relatifs à la racine du dépôt, avec « / »).
export const pluginChange = (fichiers) => fichiers.some((f) => f.startsWith('plugin/'));

// `fichiers` : liste des fichiers changés, ou null si on ne sait pas (premier push, diff
// impossible). Dans le doute sur main, on publie : l'étiquette déjà prise fera alors refuser
// la publication (workflow rouge), jamais une release silencieusement manquée.
export function decider({ evenement, branche, fichiers }) {
  if (branche !== 'main') return { action: 'publier', raison: `branche ${branche} : préversion plugin-essai` };
  if (evenement === 'workflow_dispatch') return { action: 'publier', raison: 'lancement manuel sur main : release publiée (choix de Pascal)' };
  if (fichiers === null) return { action: 'publier', raison: 'fichiers changés inconnus (premier push ou historique absent) : release tentée' };
  if (pluginChange(fichiers)) return { action: 'publier', raison: 'plugin/ a changé : release plugin-v<version>' };
  return { action: 'ignorer', raison: 'plugin/ inchangé : pas de release' };
}

// Fichiers changés entre `avant` et `sha` ; null si `avant` est nul ou si git échoue.
export function fichiersChanges(avant, sha, git = (args) => execFileSync('git', args, { encoding: 'utf8' })) {
  if (!avant || AVANT_NUL.test(avant)) return null;
  try {
    return git(['diff', '--name-only', avant, sha]).split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [evenement, branche, avant, sha] = process.argv.slice(2);
  const r = decider({ evenement, branche, fichiers: branche === 'main' && evenement === 'push' ? fichiersChanges(avant, sha) : null });
  console.log(r.action);
  console.error(r.raison);
}
