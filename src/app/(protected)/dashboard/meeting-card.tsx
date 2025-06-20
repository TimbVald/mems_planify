'use client'

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import React, { useState } from 'react'
import { Card, CardHeader, CardTitle } from '~/components/ui/card'
import { useDropzone } from 'react-dropzone'
import { uploadAudioToSupabase } from '~/lib/supabase'
import { Loader2, Presentation, Upload } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { api } from '~/trpc/react'
import { useParams, useRouter } from 'next/navigation'
import useProject from '~/hooks/use-project'
import { toast } from 'sonner'

const MeetingCard = () => {
    const {project} = useProject()
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const router = useRouter()
    const uploadMeeting = api.project.uploadMeeting.useMutation()

    const simulateProgress = (setProgress: (n: number) => void) => {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 10
          if (progress >= 90) {
            clearInterval(interval)
          }
          setProgress(Math.min(progress, 90))
        }, 200)
        return interval
      }

    const { getRootProps, getInputProps } = useDropzone({
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a'],
        },
        multiple: false,
        maxSize: 50_000_000,
        onDrop: async acceptedFiles => {
            if (!project) return
            setIsUploading(true)
            setProgress(0)
            const interval = simulateProgress(setProgress)
            try {
                console.log(acceptedFiles)
                const file = acceptedFiles[0]
                if (!file) {
                    window.alert("Aucun fichier sélectionné.")
                    return
                }

                const downloadUrl = await uploadAudioToSupabase(file as File, setProgress) as string
                uploadMeeting.mutate({
                    projectId: project.id,
                    meetingUrl: downloadUrl,
                    name: file.name
                },{
                    onSuccess: () => {
                        toast.success("Réunion téléversée avec succès")
                        router.push(`/meetings`)
                    },
                    onError: () => {
                        toast.error("Erreur lors de la téléversement de la réunion")
                    }
                })
                console.log("Fichier uploadé :", downloadUrl)
                // window.alert(downloadUrl)
            } catch (err: any) {
                console.error("Erreur de téléversement :", err.message || err)
                alert("Erreur lors de la téléversement : " + (err.message || err))
            } finally {
                setIsUploading(false)
                clearInterval(interval)
                setProgress(100)
            }
        }

    })
    return (
        <Card className='col-span-2 flex flex-col items-center justify-center p-5' {...getRootProps()}>
            {!isUploading && (
                <>
                    <Presentation className='h-10 w-10 animate-bounce' />
                    <h3 className='mt-2 text-sm font-semibold text-gray-900'>
                        Créer une nouvelle réunion
                    </h3>
                    <p className='mt-1 text-center text-sm text-gray-500'>
                        Analysez votre réunion avec Mem&apos;s AI.
                        <br />
                        Propulsé par l&apos;IA.
                    </p>
                    <div className='mt-6'>
                        <Button disabled={isUploading}>
                            <Upload className='-ml-0.5 mr-1.5 h-5 w-5' aria-hidden='true' />
                            Téléverser la réunion
                            <input {...getInputProps()} className='hidden' />
                        </Button>
                    </div>
                </>
            )}
            {isUploading && (
                <div className=''>
                    <CircularProgressbar value={progress} text={`${Math.round(progress)}%`} className='size-20' styles={buildStyles({
                        pathColor: '#2563eb',
                        textColor: '#2563eb',
                        trailColor: '#e5e7eb',
                        backgroundColor: '#2563eb',
                        textSize: '16px',
                    })} />
                    <p className='text-sm text-gray-500 text-center mt-2'>
                        	
                        Téléversement de la réunion...
                    </p>
                </div>
            )}
        </Card>
    )
}

export default MeetingCard
