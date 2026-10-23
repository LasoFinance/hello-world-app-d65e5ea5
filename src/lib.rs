use anchor_lang::prelude::*;

declare_id!("Fd7LhKeKSSVka7CZPAA2bKjFcgLbkLDt8JUFFL3L17xB");

#[program]
pub mod hello_world {
    use super::*;

    // Create or update the caller's greeting.
    pub fn say_hello(ctx: Context<SayHello>, message: String) -> Result<()> {
        require!(message.len() <= 64, HelloError::MessageTooLong);
        let g = &mut ctx.accounts.greeting;
        g.author = ctx.accounts.author.key();
        g.message = message;
        g.updates = g.updates.saturating_add(1);
        msg!("Hello, world! {} says: {}", g.author, g.message);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SayHello<'info> {
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(
        init_if_needed,
        payer = author,
        space = 8 + 32 + 4 + 64 + 8,
        seeds = [b"greeting", author.key().as_ref()],
        bump
    )]
    pub greeting: Account<'info, Greeting>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Greeting {
    pub author: Pubkey,
    pub message: String,
    pub updates: u64,
}

#[error_code]
pub enum HelloError {
    #[msg("Message must be 64 bytes or fewer")]
    MessageTooLong,
}
