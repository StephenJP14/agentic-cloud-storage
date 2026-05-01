export interface GlobalResponse<T> {
    success: boolean
    statusCode: number
    message: string
    data: T
}