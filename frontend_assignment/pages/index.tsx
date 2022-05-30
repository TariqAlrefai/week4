import detectEthereumProvider from "@metamask/detect-provider"
import { Strategy, ZkIdentity } from "@zk-kit/identity"
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols"
import { providers } from "ethers"
import Head from "next/head"
import React from "react"
import styles from "../styles/Home.module.css"
import { useForm } from "react-hook-form";
import { object, string, number } from 'yup';
import Logo from '../src/ZKU_Logo.png';

export default function Home() {
    // console.log("logo",Logo)
    const [logs, setLogs] = React.useState("Connect your wallet and greet!")
    const [logsA, setLogsA] = React.useState("Response Event")


    const {register,handleSubmit} = useForm({
        defaultValues: {
          Name: "",
          Age: "",
          Address:""
        }
      });
      
    let userSchema = object({
        Name: string().required(),
        Age: number().required().positive().integer(),
        Address: string().required()
      });

    async function greet() {
        setLogs("Creating your Semaphore identity...")

        const provider = (await detectEthereumProvider()) as any

        await provider.request({ method: "eth_requestAccounts" })

        const ethersProvider = new providers.Web3Provider(provider)
        const signer = ethersProvider.getSigner()
        const message = await signer.signMessage("Sign this message to create your identity!")

        const identity = new ZkIdentity(Strategy.MESSAGE, message)
        const identityCommitment = identity.genIdentityCommitment()
        const identityCommitments = await (await fetch("./identityCommitments.json")).json()

        const merkleProof = generateMerkleProof(20, BigInt(0), identityCommitments, identityCommitment)

        setLogs("Creating your Semaphore proof...")

        const greeting = "Hello world"

        const witness = Semaphore.genWitness(
            identity.getTrapdoor(),
            identity.getNullifier(),
            merkleProof,
            merkleProof.root,
            greeting
        )

        const { proof, publicSignals } = await Semaphore.genProof(witness, "./semaphore.wasm", "./semaphore_final.zkey")
        const solidityProof = Semaphore.packToSolidityProof(proof)

        const response = await fetch("/api/greet", {
            method: "POST",
            body: JSON.stringify({
                greeting,
                nullifierHash: publicSignals.nullifierHash,
                solidityProof: solidityProof
            })
        })

        if (response.status === 500) {
            const errorMessage = await response.text()

            setLogs(errorMessage)
        } else {
            const mess = await response.text()
            setLogsA(JSON.parse(mess)["here"])
            setLogs("Your anonymous greeting is onchain :)")
        }
    }

    // Front End
    return (
        <div className={styles.container}>
            <Head>
                <title>hello</title>
                <meta name="description" content="A simple Next.js/Hardhat privacy application with Semaphore." />
                <link rel="icon" href="/favicon.ico" />
            </Head>


            <main className={styles.main}>
                <div className={styles.titleDiv}>
                    <h1 className={styles.title}>Part 3 Frontend Assignment</h1>
                </div>
                <div className={styles.titleDiv}>
                    <img src={Logo.src} height="100%"/>
                </div>
            
                
                <div className={styles.formDiv}>
                    <form
                        onSubmit= {handleSubmit((data) => {console.log(JSON.stringify(data))
                        userSchema.validate(JSON.stringify(data))}
                    )}
                        >
                            
                        <label>Name</label>
                        <input {...register("Name")} defaultValue="Name" />
                        
                        <label>Age</label>
                        <input {...register("Age")} defaultValue="age" />

                        <label>Address</label>
                        <input {...register("Address")} defaultValue="address" />

                       
                        <input type="submit" name="submit"/>
                        
                    </form>     

                    <p className={styles.description}>A simple implementaion of front-end React</p> 

                    <div className={styles.logs}>{logs}</div> 

                    <div className={styles.logs}>{logsA}</div>

                    <div id="click" onClick={() => greet()} className={styles.button}>
                        Greet
                    </div>
                </div>
            </main>
        </div>
    )
}