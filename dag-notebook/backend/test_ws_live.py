import asyncio
import json
import websockets

async def test_live_ws():
    uri = "ws://127.0.0.1:8000/ws/execute"
    async with websockets.connect(uri) as ws:
        # Request pipeline run
        payload = {
            "action": "run_graph",
            "graph": {
                "nodes": [
                    {
                        "id": "node_1",
                        "title": "Data Ingestion",
                        "code": "import pandas as pd, numpy as np\ndf = pd.DataFrame({'Close': [100.0, 102.0, 105.0]})\nprint('Node 1 done')",
                        "inputs": [],
                        "outputs": ["df"]
                    },
                    {
                        "id": "node_2",
                        "title": "Regime Filter",
                        "code": "df_regime = df.copy()\ndf_regime['Regime'] = 'Bull'\nprint('Node 2 done')",
                        "inputs": ["df"],
                        "outputs": ["df_regime"]
                    }
                ],
                "edges": [
                    {"source": "node_1", "target": "node_2", "sourceHandle": "df", "targetHandle": "df"}
                ]
            }
        }
        await ws.send(json.dumps(payload))
        
        events = []
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            events.append(data)
            print(f"WS Event Received: {data.get('type')} - {data.get('nodeId', '')}")
            if data.get("type") in ["execution_complete", "execution_failed"]:
                break
        
        print("Test finished with", len(events), "events.")

if __name__ == "__main__":
    asyncio.run(test_live_ws())
