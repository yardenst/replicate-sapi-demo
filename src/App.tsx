import React, {useState} from 'react';
import {Button, Modal, Form, Spin, Input} from 'antd';
import {useRequest} from 'ahooks';
import {createPockemon} from './replicate';


export default function App() {
    const [pokemon, setPokemon] = useState<string | null>()

    const {loading, run} = useRequest(
        async (prompt) => {
            return await createPockemon(prompt);
        },
        {
            manual: true,
            onSuccess: (imgUrl) => {
                setPokemon(imgUrl)
            }
        }
    );
    return (
        <>
            <Modal footer={null} onCancel={() => setPokemon(null)} centered={true} open={Boolean(pokemon)}>
                {pokemon && <img src={pokemon} alt={"pokemon"}/>}
            </Modal>
            <div className={"grid h-screen place-items-center"}>
                <div className={'bg-amber-100 border border-amber-400 p-4 rounded'}>
                    This is an example of how to use Replicate API directly from a web app. No need for a backend.
                </div>
                <div
                    className={"p-10 max-w-2xl place-content-center text-center flex flex-col content-center"}>
                    <h1 className="text-3xl font-bold m-2">
                        Create Pokemon!
                    </h1>
                    <Spin tip={"Creating your Pokemon! Few moments..."} size={"large"} spinning={loading}>
                        <Form
                            className={" "}
                            disabled={loading}
                            layout='vertical'
                            name='basic'
                            onFinish={({prompt}: { prompt: string }) => {
                                run(prompt);
                            }}
                        >
                            <Form.Item
                                label='What should it look like?'
                                name='prompt'
                                rules={[{required: true, message: 'Select your Pokemon'}]}
                            >
                                <Input placeholder={"Yoda"} size={"large"}/>
                            </Form.Item>

                            <Form.Item>
                                <Button type='primary' className={"bg-amber-800"} htmlType='submit'>
                                    Create Pokemon
                                </Button>
                            </Form.Item>
                        </Form>
                    </Spin>
                </div>
            </div>
        </>
    );
}
