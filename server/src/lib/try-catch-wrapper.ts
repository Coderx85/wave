type TryCatchContext<T> = {
  ctx: () => Promise<T>;
  errorMessage?: string;
};

export async function tryCatch<T>(ctx: TryCatchContext<T>): Promise<T> {
  try {
    return await ctx.ctx();
  } catch (error) {  
    console.error(ctx.errorMessage || "Error in tryCatch: =====\n", error instanceof Error ? error.stack : error);
    throw new Error(
      `\n ${(ctx.errorMessage  || "Error in tryCatch ==== \n")}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};