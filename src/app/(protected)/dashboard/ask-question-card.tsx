/* eslint-disable react/jsx-key */
/* eslint-disable react/jsx-no-undef */
/* eslint-disable react-hooks/rules-of-hooks */
'use client'

import MDEditor  from '@uiw/react-md-editor'
import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import useProject from '~/hooks/use-project'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { askQuestion } from './action'
import { readStreamableValue } from 'ai/rsc'
import CodeReferences from './code-references'
import { api } from '~/trpc/react'
import { toast } from 'sonner'

const askQuestionCard = () => {
    const { project } = useProject()
    const [open, setOpen] = useState(false)
    const [question, setQuestion] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [filesReferences, setFilesReferences] = useState<{filename: string; sourceCode: string; summary: string}[]>([])
    const [answer, setAnswer] = useState('')
    const savedAnswer = api.project.saveAnswer.useMutation()

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setAnswer('')
        setFilesReferences([])
        e.preventDefault()
        if (!project?.id) return
        setIsLoading(true)
        // setOpen(true)

        const {output, filesReferences} = await askQuestion(question, project.id)
        setOpen(true)
        setFilesReferences(filesReferences)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setAnswer(ans => ans + delta)
            }
        }
        setIsLoading(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className='sm:max-w-[80vw]'>
                    <DialogHeader>
                        <div className='flex items-center gap-2'>
                        <DialogTitle>
                            <Image src="/logo.png" alt="Mem's Planify" width={32} height={32} />
                        </DialogTitle>
                        <Button disabled={savedAnswer.isPending} variant='outline' onClick={() => {
                            savedAnswer.mutate({
                                projectId: project!.id,
                                question: question,
                                answer: answer,
                                filesReferences
                            }, {
                                onSuccess: () => {
                                    toast.success('Answer saved')
                                },
                                onError: () => {
                                    toast.error('Failed to save answer')
                                }
                            })
                        }}>
                            Save Answer
                        </Button>
                        </div>
                    </DialogHeader>
                    <MDEditor.Markdown source={answer} className='max-w-[70vw] !h-full max-h-[40vh] overflow-scroll'/>
                    <div className="h-4"></div>
                    <CodeReferences filesReferences={filesReferences} />

                    <Button type='button' onClick={() => {setOpen(false)}}>
                        Close
                    </Button>
                </DialogContent>
            </Dialog>
            <Card className='relative col-span-3'>
                <CardHeader>
                    <CardTitle>
                        Ask a Question
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form action="" onSubmit={onSubmit}>
                        <Textarea placeholder='Quel fichier dois-je éditer pour changer la page d&apos;accueil ?' value={question} onChange={(e) => setQuestion(e.target.value)} />
                        <div className='h-4'></div>
                        <Button type='submit' disabled={isLoading}>
                            Demander à Mem&apos;s AI !
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </>
    )
}

export default askQuestionCard
