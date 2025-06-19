/**
 * Hook personnalisé pour gérer la sélection et l'accès aux projets
 * Permet de récupérer la liste des projets et de gérer le projet actuellement sélectionné
 */
import React from 'react'
import { api } from '~/trpc/react'
import {useLocalStorage} from 'usehooks-ts'

const useProject = () => {
  // Récupère la liste des projets depuis l'API via tRPC
  const {data: projects} = api.project.getProjects.useQuery()
  
  // Stocke l'ID du projet sélectionné dans le localStorage
  // La valeur par défaut est un espace ' ' pour éviter les valeurs null/undefined
  const [projectId, setProjectId] = useLocalStorage('mems-projectId', ' ')
  
  // Trouve le projet correspondant à l'ID stocké
  const project = projects?.find(project => project.id === projectId)

  // Retourne les données et fonctions utiles pour la gestion des projets
  return {projects, project, projectId, setProjectId}
}
 
export default useProject
