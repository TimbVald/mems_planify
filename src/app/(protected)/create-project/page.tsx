/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
'use client'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import useRefetch from '~/hooks/use-refetch'
import { api } from '~/trpc/react'

type FormInput = {
    repoUrl: string
    projectName: string
    githubToken?: string
}

const CreatePage = () => {
    const { register, handleSubmit, reset } = useForm<FormInput>()
    const createProject = api.project.createProject.useMutation()
    const refetch = useRefetch()

    function onSubmit(data: FormInput) {
        // window.alert(JSON.stringify(data, null, 2))
        createProject.mutate({
            name: data.projectName,
            githubUrl: data.repoUrl,
            githubToken: data.githubToken
        }, {
            onSuccess: () => {
                toast.success('Projet créé avec succès')
                refetch()
                reset()
            },
            onError: () => {
                toast.error('Erreur lors de la création du projet')
            }
        })
        return true
    }

    return (
        <div className='flex items-center gap-2 h-full justify-center '>
            <img src='/logo.png' className='h-5 w-auto' />
            <div>
                <div>
                    <h1 className='font-bold text-2xl'>
                        Lien vers votre dépôt GitHub
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Entrez l&apos;URL de votre dépôt pour le lier à Mem&apos;s Planify
                    </p>
                </div>
                <div className="h-4"></div>
                <div>
                    <form action="" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            {...register('projectName', { required: true })}
                            placeholder='Nom du projet'
                            required
                        />
                        <div className="h-2"></div>
                        <Input
                            {...register('repoUrl', { required: true })}
                            placeholder='URL Github'
                            type='url'
                            required
                        />
                        <div className="h-2"></div>
                        <Input
                            {...register('githubToken')}
                            placeholder='Github Token (Optionnel)'
                        />
                        <div className="h-4"></div>
                        <Button type='submit' disabled={createProject.isPending}>
                            {createProject.isPending ? (
                                <>
                                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                                    Création du projet...
                                </>
                            ) : (
                                'Créer le projet'
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CreatePage
