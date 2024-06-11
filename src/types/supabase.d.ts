declare namespace Supabase {
    type SignUpResponseErrpr = {
        code: number;
        error_code: string;
        msg: string;
    };

    type TokenResponseSuccess = {
        access_token: string;
        token_type: string;
        expires_in: number;
        expires_at: number;
        refresh_token: string;
        user: User;
    };

    type TokenResponseError = {
        error: string;
        error_description: string;
    };

    type UserResponseSuccess = User;

    type UserResponseError = {
        code: number;
        error_code: string;
        msg: string;
    };

    type User = {
        id: string;
        email: string;
    };
}
