// =======================================================
// GLOBAL USINGS
// =======================================================
global using Microsoft.AspNetCore.Authentication;
global using Microsoft.AspNetCore.Authentication.JwtBearer;
global using Microsoft.AspNetCore.Authorization;
global using Microsoft.AspNetCore.Mvc;
global using Microsoft.AspNetCore.Mvc.Authorization;
global using Microsoft.AspNetCore.SignalR;
global using Microsoft.Data.SqlClient;
global using Microsoft.EntityFrameworkCore;
global using Microsoft.EntityFrameworkCore.Storage;
global using Microsoft.IdentityModel.Tokens;
global using Quizback.Dto;
global using Quizback.Helpter;
global using Quizback.Models;
global using Quizback.Services;
global using QuizBack.Hubs;
global using QuizBack.utils;
global using System;
global using System.Collections.Generic;
global using System.IdentityModel.Tokens.Jwt;
global using System.Security.Claims;
global using System.Text;
using Microsoft.Extensions.FileProviders;


// =======================================================
// BUILD APP
// =======================================================
var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";


// =======================================================
// DB CONTEXT
// =======================================================
builder.Services.AddDbContextPool<TriCareerContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectionString")));


// =======================================================
// CONTROLLERS + JSON SETTINGS
// =======================================================
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
        options.SerializerSettings.ReferenceLoopHandling =
            Newtonsoft.Json.ReferenceLoopHandling.Ignore
    );
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 100 * 1024 * 1024; // 100 MB
});


// =======================================================
// SIGNALR
// =======================================================
builder.Services.AddSignalR();


// =======================================================
// DEPENDENCY INJECTION : SERVICES
// =======================================================
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IResponseDetailService, ReponseDetailService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IAiService, AiService>();
builder.Services.AddScoped<ISectionService, SectionService>();
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<ILevelService, LevelService>();
builder.Services.AddScoped<IHistService, HistAppService>();
builder.Services.AddScoped<IExamanService, ExamanService>();
builder.Services.AddScoped<IDetailsExamanService, DetailsExamanService>();
builder.Services.AddScoped<IAnswerService, AnswerService>();
builder.Services.AddScoped<IOffreService, OffreService>();
builder.Services.AddScoped<IStatusService, StatusService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IResponseValueService, ResponseValueService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IRecruitementProcessService, RecruitementProcessService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<IJobPostingService, JobPostingService>();
builder.Services.AddScoped<ITimelineService, TimelineService>();
builder.Services.AddScoped<IPiplineService, PiplineService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmtpSettingsService, SmtpSettingsService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IGoogleCalendarService, GoogleCalendarService>();
builder.Services.AddScoped<IAiQuizService, AiQuizService>();

builder.Services.AddHttpClient<IWherebyService, WherebyService>();
// US23/US29 : service de classement IA (appelle le micro-service matching-ai)
builder.Services.AddHttpClient<IRankingService, RankingService>();
// US12/US19/US20 : service d'analyse IA (forces/faiblesses, compétences manquantes, rapport)
builder.Services.AddHttpClient<IAnalysisService, AnalysisService>();
// Jwt interne (optionnel)
builder.Services.AddScoped<IJWtService, JwtService>();


// =======================================================
// SWAGGER
// =======================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "TriCareer API",
        Version = "v1"
    });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token here"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
    // Prevent duplicate schema name crashes
    c.CustomSchemaIds(type => type.FullName?.Replace("+", "_") ?? type.Name);
});


// =======================================================
// EMAIL SETTINGS
// =======================================================
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));


// =======================================================
// CORS
// =======================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://localhost:5175",
                    "http://localhost:5176",
                    "http://localhost:3000"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});


// =======================================================
// JWT AUTH (simple self-signed)
// =======================================================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(options =>
  {
      options.TokenValidationParameters = new TokenValidationParameters
      {
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateLifetime = true,
          ValidateIssuerSigningKey = true,
          ValidIssuer = builder.Configuration["Jwt:Issuer"],
          ValidAudience = builder.Configuration["Jwt:Audience"],
          IssuerSigningKey = new SymmetricSecurityKey(
              Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
          )
      };
  });


// =======================================================
// ❌ AUTORISATION GLOBALE DÉSACTIVÉE
// =======================================================

// builder.Services.AddAuthorization(options =>
// {
//     options.FallbackPolicy = new AuthorizationPolicyBuilder()
//         .RequireAuthenticatedUser()
//         .Build();
// });

// builder.Services.AddControllers(options =>
// {
//     var policy = new AuthorizationPolicyBuilder()
//         .RequireAuthenticatedUser()
//         .Build();

//     options.Filters.Add(new AuthorizeFilter(policy));
// });


// =======================================================
// BUILD
// =======================================================
var app = builder.Build();


// =======================================================
// PIPELINE HTTP
// =======================================================
app.UseCors(MyAllowSpecificOrigins);

app.MapHub<NotificationHub>("Hub/NotificationHub");

app.UseStaticFiles(new StaticFileOptions()
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), @"Resources")),
    RequestPath = new PathString("/Resources")
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();


// =======================================================
// AUTH PIPELINE
// =======================================================
// Keep order: CORS -> Authentication -> Authorization
app.UseAuthentication();
app.UseAuthorization();


// =======================================================
// ROUTES
// =======================================================
app.MapControllers();

app.Run();