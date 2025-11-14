from typing import AsyncGenerator, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph

from ...models import QueryOptions
from .nodes import CallModelNode, CallToolNode, ShouldCallToolCondition
from .toolkit import QueryGraphState, SQLDatabaseToolkit
from .utils import SQLDatabaseFromEngine


class QueryGraphService:
    def __init__(self, engine) -> None:
        self.db = SQLDatabaseFromEngine(engine)
        self.toolkit = SQLDatabaseToolkit(db=self.db)

    async def query(
        self, query: str, options: QueryOptions, history: Sequence[BaseMessage] | None = None
    ) -> AsyncGenerator[tuple[Sequence[BaseMessage] | None, list[dict] | None], None]:
        graph = self.build_graph()
        app = graph.compile()

        initial_state = {
            "messages": self._initial_messages(query, history),
            "results": [],
            "options": options,
            "sql_toolkit": self.toolkit,
            "user_query": query,
        }

        async for chunk in app.astream(initial_state):
            for _, tool_chunk in chunk.items():
                yield (tool_chunk.get("messages"), tool_chunk.get("results"))

    def build_graph(self) -> StateGraph:
        graph = StateGraph(QueryGraphState)
        graph.add_node(CallModelNode.__name__, CallModelNode.run)
        graph.add_node(CallToolNode.__name__, CallToolNode.run)
        graph.add_conditional_edges(CallModelNode.__name__, ShouldCallToolCondition.run)
        graph.add_edge(CallToolNode.__name__, CallModelNode.__name__)
        graph.set_entry_point(CallModelNode.__name__)
        return graph

    def _initial_messages(self, user_query: str, history: Sequence[BaseMessage] | None) -> list[BaseMessage]:
        return []  # we keep messages minimal; model node constructs prompt


