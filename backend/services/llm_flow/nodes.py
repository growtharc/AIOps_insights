from typing import cast

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langgraph.graph import END

from ...models import SQLQueryStringResult, SQLQueryRunResult
from .toolkit import QueryGraphState, QueryGraphStateUpdate, SQLDatabaseToolkit, StateUpdaterTool, state_update
from .prompt import SYSTEM_PROMPT


class CallModelNode:
    __name__ = "call_model"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        model = ChatOpenAI(
            model=state.options.llm_model,
            base_url=state.options.openai_base_url,
            api_key=state.options.openai_api_key,
            temperature=0,
        )
        tools = [convert_to_openai_function(t) for t in state.sql_toolkit.get_tools()]
        model = cast(ChatOpenAI, model.bind_tools(tools))

        messages: list[BaseMessage] = [HumanMessage(content=SYSTEM_PROMPT + "\n\n" + state.user_query)]
        response = model.invoke(messages)
        return state_update(messages=[response])


class CallToolNode:
    __name__ = "perform_action"

    @classmethod
    def run(cls, state: QueryGraphState) -> QueryGraphStateUpdate:
        last_ai = cast(AIMessage, state.messages[-1])
        output_messages: list[BaseMessage] = []
        results: list[dict] = []

        for tool_call in last_ai.tool_calls:
            tool = state.sql_toolkit.tool_map[tool_call["name"]]
            if isinstance(tool, StateUpdaterTool):
                updates = tool.get_response(state, tool_call["args"], str(tool_call["id"]))
                output_messages.extend(updates["messages"])
                results.extend(updates["results"])
            else:
                resp = tool.run(tool_call["args"])  # type: ignore[arg-type]
                output_messages.append(
                    ToolMessage(content=str(resp), name=tool_call["name"], tool_call_id=str(tool_call["id"]))
                )

        return state_update(messages=output_messages, results=results)


class ShouldCallToolCondition:
    @classmethod
    def run(cls, state: QueryGraphState):
        last = state.messages[-1]
        if "tool_calls" not in last.additional_kwargs:
            return END
        return CallToolNode.__name__


