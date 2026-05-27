using Microsoft.AspNetCore.Http;
using System;
using Redmine.Net.Api;

namespace RedKanban.Backend.Services
{
    public interface IRedmineClientProvider
    {
        string RedmineUrl { get; }
        string ApiKey { get; }
        string ProjectIdentifier { get; }
        RedmineManager GetManager();
    }

    public class RedmineClientProvider : IRedmineClientProvider
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RedmineClientProvider(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private HttpContext HttpContext => _httpContextAccessor.HttpContext 
            ?? throw new InvalidOperationException("HTTP context is not available.");

        public string RedmineUrl
        {
            get
            {
                var envUrl = Environment.GetEnvironmentVariable("REDMINE_URL");
                if (!string.IsNullOrWhiteSpace(envUrl))
                {
                    return envUrl;
                }
                return HttpContext.Request.Headers["X-Redmine-URL"].ToString();
            }
        }
        public string ApiKey => HttpContext.Request.Headers["X-Redmine-API-Key"].ToString();
        public string ProjectIdentifier => HttpContext.Request.Headers["X-Redmine-Project-Identifier"].ToString();

        public RedmineManager GetManager()
        {
            var url = RedmineUrl;
            var key = ApiKey;

            if (string.IsNullOrWhiteSpace(url))
                throw new InvalidOperationException("A URL do Redmine não foi configurada (variável de ambiente REDMINE_URL ou header X-Redmine-URL).");
            if (string.IsNullOrWhiteSpace(key))
                throw new InvalidOperationException("A API Key do Redmine não foi fornecida nos headers (X-Redmine-API-Key).");

            // Se rodando em container docker e a URL fornecida for localhost/127.0.0.1,
            // traduz para o serviço docker do redmine ("http://redmine:3000")
            bool isDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
            if (isDocker && (url.Contains("localhost") || url.Contains("127.0.0.1")))
            {
                // Substitui localhost:XXXX ou 127.0.0.1:XXXX por redmine:3000
                url = System.Text.RegularExpressions.Regex.Replace(url, @"(localhost|127\.0\.0\.1)(:\d+)?", "redmine:3000");
            }

            var options = new RedmineManagerOptionsBuilder()
                .WithHost(url)
                .WithApiKeyAuthentication(key);

            return new RedmineManager(options);
        }
    }
}
